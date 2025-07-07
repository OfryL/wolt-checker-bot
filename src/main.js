const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const Database = require('./database');

// Bot configuration
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('TELEGRAM_BOT_TOKEN environment variable is required');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

// Conversation states
const SEARCH = 'search';
const CHECKER = 'checker';

// User states storage
const userStates = new Map();

// API endpoint
const WOLT_API = 'https://restaurant-api.wolt.com/v1';
const WOLT_API_V3 = 'https://restaurant-api.wolt.com/v3/venues/slug';

// Helper function to get restaurant name in preferred language
function getRestaurantName(nameArray) {
    try {
        const hebrewName = nameArray.find(name => name.lang === 'he');
        if (hebrewName) return hebrewName.value;
        
        const englishName = nameArray.find(name => name.lang === 'en');
        if (englishName) return englishName.value;
        
        return nameArray[0]?.value || 'Unknown Restaurant';
    } catch (error) {
        return 'Unknown Restaurant';
    }
}

// Start command handler
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    userStates.set(userId, SEARCH);
    
    bot.sendMessage(chatId, `Hello :)
Please Enter the restaurant name you want to check.
It can be in English/Hebrew.
To show current notification registrations please write: /show`);
});

// Show registrations command handler
bot.onText(/\/show/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    try {
        const db = new Database();
        const registrations = await db.getUserActiveNotifications(userId);
        
        if (registrations.length === 0) {
            bot.sendMessage(chatId, "You are not registered for any notification right now.");
            return;
        }

        for (const slug of [...new Set(registrations)]) {
            try {
                const response = await axios.get(`${WOLT_API_V3}/${slug}`);
                const restaurant = response.data.results[0];
                const restName = getRestaurantName(restaurant.name);
                
                const options = {
                    reply_markup: {
                        inline_keyboard: [[
                            { text: 'Remove', callback_data: `REMOVE_${slug}` }
                        ]]
                    }
                };
                
                bot.sendMessage(chatId, restName, options);
            } catch (error) {
                console.error('Error fetching restaurant details:', error);
            }
        }
        
        db.close();
    } catch (error) {
        console.error('Error showing registrations:', error);
        bot.sendMessage(chatId, "An error occurred while fetching your registrations.");
    }
});

// Cancel command handler
bot.onText(/\/cancel/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    userStates.delete(userId);
    bot.sendMessage(chatId, `Thank you for using Wolt Checker Bot :)

To re-run the bot, please write /start`);
});

// Text message handler for restaurant search
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    
    // Skip if it's a command
    if (text && text.startsWith('/')) {
        return;
    }
    
    const userState = userStates.get(userId);
    
    if (userState === SEARCH && text) {
        try {
            bot.sendChatAction(chatId, 'typing');
            
            const response = await axios.get(`${WOLT_API}/search?sort=relevancy&q=${encodeURIComponent(text)}`);
            const results = response.data.results;
            
            if (results && results.length > 0) {
                const buttons = results.slice(0, 10).map(result => {
                    const restName = getRestaurantName(result.value.name);
                    return [{ text: restName, callback_data: result.value.slug }];
                });
                
                const options = {
                    reply_markup: {
                        inline_keyboard: buttons
                    }
                };
                
                bot.sendMessage(chatId, "Please Select the wanted restaurant", options);
                userStates.set(userId, CHECKER);
            } else {
                bot.sendMessage(chatId, "I'm Sorry! No restaurants were found.\nYou can search for another one if you like.");
            }
        } catch (error) {
            console.error('Error searching restaurants:', error);
            bot.sendMessage(chatId, "An error occurred while searching for restaurants. Please try again.");
        }
    }
});

// Callback query handler
bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    
    bot.answerCallbackQuery(callbackQuery.id);
    
    const userState = userStates.get(userId);
    
    if (data.startsWith('REGISTER_') || data.startsWith('REMOVE_') || data === 'NO') {
        await handleRegistration(callbackQuery);
    } else if (userState === CHECKER) {
        await handleRestaurantCheck(callbackQuery);
    }
});

async function handleRestaurantCheck(callbackQuery) {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;
    const slug = callbackQuery.data;
    
    try {
        const response = await axios.get(`${WOLT_API_V3}/${slug}`);
        const restaurant = response.data.results[0];
        const restName = getRestaurantName(restaurant.name);
        const isOnline = restaurant.online;
        const restLink = restaurant.public_url;
        
        if (isOnline) {
            const message = `${restName} is OPEN :)

<b><a href="${restLink}">Click here to order from ${restName}</a></b>

Thank you for using Wolt Checker Bot :)
To re-run the bot, please write /start`;
            
            bot.editMessageText(message, {
                chat_id: chatId,
                message_id: msg.message_id,
                parse_mode: 'HTML'
            });
            
            userStates.delete(userId);
        } else {
            const options = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Yes', callback_data: `REGISTER_${slug}_${restName}` }],
                        [{ text: 'No', callback_data: 'NO' }]
                    ]
                }
            };
            
            bot.editMessageText(
                `${restName} is CLOSED :(

Do you want to register for an update when the restaurant will be open again ?`,
                {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    reply_markup: options.reply_markup
                }
            );
            
            userStates.set(userId, SEARCH);
        }
    } catch (error) {
        console.error('Error checking restaurant:', error);
        bot.sendMessage(chatId, "An error occurred while checking the restaurant. Please try again.");
    }
}

async function handleRegistration(callbackQuery) {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    
    const dataParts = data.split('_');
    const action = dataParts[0];
    
    if (action === 'NO') {
        bot.editMessageText(
            `Thank you for using Wolt Checker Bot :)

To re-run the bot, please write /start`,
            {
                chat_id: chatId,
                message_id: msg.message_id
            }
        );
        userStates.delete(userId);
        return;
    }
    
    if (action === 'REMOVE') {
        const slug = dataParts[1];
        
        try {
            const db = new Database();
            await db.removeNotification(userId, slug, 'UserManually');
            db.close();
            
            bot.editMessageText(
                "No Problem, you are removed from being notified.",
                {
                    chat_id: chatId,
                    message_id: msg.message_id
                }
            );
        } catch (error) {
            console.error('Error removing notification:', error);
            bot.sendMessage(chatId, "An error occurred while removing the notification.");
        }
        return;
    }
    
    if (action === 'REGISTER') {
        const slug = dataParts[1];
        const restName = dataParts.slice(2).join('_');
        
        try {
            const db = new Database();
            await db.addNewNotification(userId, slug);
            db.close();
            
            bot.editMessageText(
                `No Problem, you will be notified once ${restName} is open.

Thank you for using Wolt Checker Bot :)

To re-run the bot, please write /start`,
                {
                    chat_id: chatId,
                    message_id: msg.message_id
                }
            );
            
            userStates.delete(userId);
        } catch (error) {
            console.error('Error adding notification:', error);
            bot.sendMessage(chatId, "An error occurred while registering for notifications.");
        }
    }
}

// Error handling
bot.on('error', (error) => {
    console.error('Bot error:', error);
});

bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

console.log('Wolt Checker Bot is running...'); 