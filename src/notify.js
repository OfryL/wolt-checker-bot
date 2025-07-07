const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const Database = require('./database');

// Bot configuration
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('TELEGRAM_BOT_TOKEN environment variable is required');
    process.exit(1);
}

const bot = new TelegramBot(token);

// API endpoint
const WOLT_API_V3 = 'https://restaurant-api.wolt.com/v3/venues/slug';

// Helper function to get restaurant name in preferred language
function getRestaurantName(nameArray) {
    try {
        const englishName = nameArray.find(name => name.lang === 'en');
        if (englishName) return englishName.value;
        
        const hebrewName = nameArray.find(name => name.lang === 'he');
        if (hebrewName) return hebrewName.value;
        
        return nameArray[0]?.value || 'Unknown Restaurant';
    } catch (error) {
        return 'Unknown Restaurant';
    }
}

async function notify(userId, slug, restName, restLink) {
    try {
        const message = `Hey there,
${restName} is now ONLINE!!! Enjoy :)

<b><a href="${restLink}">Click here to order from ${restName}</a></b>
\u200C`; // Zero-width non-joiner

        await bot.sendMessage(userId, message, { parse_mode: 'HTML' });
        
        // Remove the notification after sending
        const db = new Database();
        await db.removeNotification(userId, slug, 'Notified');
        db.close();
        
        console.log(`Notification sent to user ${userId} for restaurant ${restName}`);
    } catch (error) {
        console.error(`Error sending notification to user ${userId}:`, error);
    }
}

async function checkRestaurant(slug, notifications) {
    try {
        const response = await axios.get(`${WOLT_API_V3}/${slug}`);
        const restaurant = response.data.results[0];
        const isOnline = restaurant.online;
        
        if (isOnline) {
            const restName = getRestaurantName(restaurant.name);
            const restLink = restaurant.public_url;
            
            // Get all users who need to be notified for this restaurant
            const usersToNotify = [...new Set(
                notifications
                    .filter(notification => notification.slug === slug)
                    .map(notification => notification.userId)
            )];
            
            // Send notifications to all users
            const notificationPromises = usersToNotify.map(userId => 
                notify(userId, slug, restName, restLink)
            );
            
            await Promise.all(notificationPromises);
            
            console.log(`Restaurant ${restName} is now online. Notified ${usersToNotify.length} users.`);
        }
    } catch (error) {
        console.error(`Error checking restaurant ${slug}:`, error);
    }
}

async function main() {
    try {
        console.log('Checking restaurants...');
        
        const db = new Database();
        const notifications = await db.getAllActiveNotifications();
        db.close();
        
        if (notifications.length === 0) {
            console.log('No active notifications to check.');
            return;
        }
        
        // Get unique slugs
        const uniqueSlugs = [...new Set(notifications.map(n => n.slug))];
        
        console.log(`Checking ${uniqueSlugs.length} restaurants for ${notifications.length} active notifications...`);
        
        // Check all restaurants in parallel
        const checkPromises = uniqueSlugs.map(slug => 
            checkRestaurant(slug, notifications)
        );
        
        await Promise.all(checkPromises);
        
        console.log('Restaurant check completed.');
    } catch (error) {
        console.error('Error in main notification loop:', error);
    }
}

// If running as standalone script
if (require.main === module) {
    console.log('Starting Wolt Checker notification service...');
    
    // Run immediately
    main();
    
    // Then run every 10 seconds
    setInterval(main, 10000);
}

module.exports = { main, checkRestaurant, notify }; 