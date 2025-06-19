const { chromium } = require('playwright');

// Helper function for random sleep
const randomSleep = (min, max) => {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay * 1000));
};

// Refactored: Export sendMessages(contacts, templates, config, control)
async function sendMessages(contacts, templates, config = {}, control = {}) {
    const sleepMin = typeof config.sleepMin === 'number' ? config.sleepMin : 15;
    const sleepMax = typeof config.sleepMax === 'number' ? config.sleepMax : 20;
    const batchCount = typeof config.batchCount === 'number' ? config.batchCount : 10;
    const batchSleepMin = typeof config.batchSleepMin === 'number' ? config.batchSleepMin : 40;
    const batchSleepMax = typeof config.batchSleepMax === 'number' ? config.batchSleepMax : 60;

    const browser = await chromium.launchPersistentContext('./playwright-data', {
        headless: false
    });
    const page = browser.pages()[0] || await browser.newPage();
    await page.goto('https://www.instagram.com/');
    await new Promise(resolve => setTimeout(resolve, 2000));
    let sentCount = 0;
    for (const contact of contacts) {
        const username = contact.username;
        if (!username) continue;

        if (control.stopped) {
            console.log('🛑 Sending stopped by user. Exiting...');
            break;
        }
        
        while (control.paused) {
            if (control.stopped) {
                console.log('🛑 Sending stopped by user during pause. Exiting...');
                await browser.close();
                return;
            }
            console.log('⏸️ Paused. Waiting 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        try {
            console.log(`🔍 Searching for profile ${username}...`);
            const searchButtonAlt = await page.waitForSelector('a[role="link"] svg[aria-label="Search"]', { timeout: 10000 });
            await searchButtonAlt.click();
            console.log('✅ Clicked search button (alternative method)');
            await randomSleep(1, 2);
            try {
                const searchInput = await page.waitForSelector('input[aria-label="Search input"]', { timeout: 10000 });
                await searchInput.fill('');
                await randomSleep(2, 3);
                // Type username character by character
                for (const char of username) {
                    await searchInput.press(char);
                    await randomSleep(0.10, 0.20); // small delay between keystrokes
                }
                await randomSleep(2, 4);

                const userResult = await page.waitForSelector('xpath=/html/body/div[1]/div/div/div[2]/div/div/div[1]/div[1]/div[2]/div/div/div[2]/div/div/div/div[2]/div/div/div[2]/div/a[1]', { timeout: 10000 });
                await userResult.click();
                console.log(`✅ Clicked on first user result for ${username}`);
                await randomSleep(2, 5);
            } catch (error) {
                console.log(`❌ Could not find search results for ${username}, skipping...`);
                continue;
            }
            try {
                const pageContent = await page.content();
                if (pageContent.toLowerCase().includes('sorry') && 
                    (pageContent.toLowerCase().includes('page isn\'t available') || 
                     pageContent.toLowerCase().includes('user not found'))) {
                    console.log(`❌ Profile ${username} doesn't exist, skipping...`);
                    continue;
                }
            } catch (error) {
                console.log(`❌ Profile ${username} doesn't exist or failed to load, skipping...`);
                continue;
            }
            console.log(`✅ Profile ${username} exists, looking for message options...`);
            try {
                const messageButton = await page.waitForSelector('text=Message', { timeout: 5000 });
                await messageButton.click();
                console.log(`✅ Found Message button for ${username}`);
            } catch (error) {
                try {
                    console.log(`🔍 Message button not found, looking for 3 dots menu...`);
                    const threeDotsButton = await page.waitForSelector('div[role="button"] svg[aria-label="Options"]', { timeout: 60000 });
                    await threeDotsButton.click();
                    await randomSleep(1, 3);
                    const sendMessageButton = await page.waitForSelector('button:has-text("Send message")', { timeout: 5000 });
                    await sendMessageButton.click();
                    console.log(`✅ Found Send message option in 3 dots menu for ${username}`);
                } catch (error) {
                    console.log(`❌ Could not find Message button or 3 dots menu for ${username}, skipping...`);
                    continue;
                }
            }
            await randomSleep(2, 4);
            try {
                const messageInput = await page.waitForSelector('div[contenteditable="true"][aria-label="Message"]', { timeout: 10000 });
                // Pick a random template and personalize it
                const template = templates[Math.floor(Math.random() * templates.length)];
                const personalizedMessage = template.replace(/{{(.*?)}}/g, (_, key) => contact[key.trim()] || '');
                await messageInput.fill(''); // Clear the input
                await randomSleep(0.5, 1.5);
                await messageInput.fill(personalizedMessage); // Type the personalized message
                // Sleep for a random time before sending (user-configurable)
                await randomSleep(sleepMin, sleepMax);
                await messageInput.press('Enter');
                console.log(`✅ Sent to ${username}: ${personalizedMessage}`);
                sentCount++;
                // After every batchCount messages, sleep for a longer random time
                if (sentCount % batchCount === 0) {
                    const batchSleep = Math.random() * (batchSleepMax - batchSleepMin) + batchSleepMin;
                    console.log(`⏸️ Batch sleep for ${batchSleep.toFixed(1)} seconds after ${sentCount} messages...`);
                    await new Promise(resolve => setTimeout(resolve, batchSleep * 1000));
                }
                await randomSleep(2, 5);
            } catch (error) {
                console.log(`❌ Failed to load DM page for ${username}, skipping...`);
                continue;
            }
        } catch (error) {
            console.log(`❌ Failed to message ${username}: ${error.message}`);
            continue;
        }
    }
    await browser.close();
}

module.exports = { sendMessages }; 