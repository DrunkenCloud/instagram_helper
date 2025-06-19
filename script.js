const { chromium } = require('playwright');

// Helper function for random sleep
const randomSleep = (min, max) => {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay * 1000));
};

// Helper function to check if page is loaded
async function waitForPageLoad(page, timeout = 15000) {
    try {
        await page.waitForLoadState('networkidle', { timeout });
        return true;
    } catch (e) {
        try {
            await page.waitForLoadState('domcontentloaded', { timeout });
            return true;
        } catch (e2) {
            return false;
        }
    }
}

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
    const initialLoaded = await waitForPageLoad(page);
    if (!initialLoaded) {
        sendLiveLog('❌ Failed to load Instagram home page. Exiting...');
        await browser.close();
        return;
    }
    console.log('Waiting 60 seconds for you to login manually...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    let sentCount = 0;
    for (const contact of contacts) {
        const username = contact.username;
        if (!username) continue;
        await checkStopPause(control, browser);
        try {
            const searchButtonAlt = await page.waitForSelector('a[role="link"] svg[aria-label="Search"]', { timeout: 10000 });
            await searchButtonAlt.click();
            await randomSleep(1, 2);
            await checkStopPause(control, browser);
            try {
                await checkStopPause(control, browser);
                const searchInput = await page.waitForSelector('input[aria-label="Search input"]', { timeout: 10000 });
                await searchInput.fill('');
                await randomSleep(2, 3);
                for (const char of username) {
                    await checkStopPause(control, browser);
                    await searchInput.press(char);
                    await randomSleep(0.10, 0.20);
                }
                await randomSleep(2, 4);
                await checkStopPause(control, browser);
                const userResult = await page.waitForSelector('xpath=/html/body/div[1]/div/div/div[2]/div/div/div[1]/div[1]/div[2]/div/div/div[2]/div/div/div/div[2]/div/div/div[2]/div/a[1]', { timeout: 10000 });
                await userResult.click();
                if (!loaded) {
                    sendLiveLog(`❌ Failed to load user profile page for ${username}, skipping...`);
                    continue;
                }
                await randomSleep(2, 5);
            } catch (error) {
                sendLiveLog(`❌ Could not find search results for ${username}, skipping...`);
                continue;
            }
            try {
                const pageContent = await page.content();
                if (pageContent.toLowerCase().includes('sorry') && 
                    (pageContent.toLowerCase().includes('page isn\'t available') || 
                     pageContent.toLowerCase().includes('user not found'))) {
                    sendLiveLog(`❌ Profile ${username} doesn't exist, skipping...`);
                    continue;
                }
            } catch (error) {
                sendLiveLog(`❌ Profile ${username} doesn't exist or failed to load, skipping...`);
                continue;
            }
            try {
                const messageButton = await page.waitForSelector('text=Message', { timeout: 5000 });
                await messageButton.click();
                await randomSleep(2, 4);
            } catch (error) {
                try {
                    console.log(`🔍 Message button not found, looking for 3 dots menu...`);
                    const threeDotsButton = await page.waitForSelector('div[role="button"] svg[aria-label="Options"]', { timeout: 60000 });
                    await threeDotsButton.click();
                    await checkStopPause(control, browser);
                    await randomSleep(1, 3);
                    const sendMessageButton = await page.waitForSelector('button:has-text("Send message")', { timeout: 5000 });
                    await sendMessageButton.click();
                    await randomSleep(2, 4);
                } catch (error) {
                    sendLiveLog(`❌ Could not find Message button or 3 dots menu for ${username}, skipping...`);
                    continue;
                }
            }
            await randomSleep(2, 4);
            try {
                const messageInput = await page.waitForSelector('div[contenteditable="true"][aria-label="Message"]', { timeout: 10000 });
                await checkStopPause(control, browser);
                // Pick a random template and personalize it
                const template = templates[Math.floor(Math.random() * templates.length)];
                const personalizedMessage = template.replace(/{{(.*?)}}/g, (_, key) => contact[key.trim()] || '');
                await messageInput.fill(''); // Clear the input
                await randomSleep(0.5, 1.5);
                // Sleep for a random time before sending (user-configurable)
                for (const char of personalizedMessage) {
                    await checkStopPause(control, browser);
                    await messageInput.press(char);
                    await randomSleep(0.10, 0.20);
                }
                await randomSleep(sleepMin, sleepMax);
                await messageInput.press('Enter');
                sendLiveLog(`✅ Sent to ${username}`);
                sentCount++;
                // After every batchCount messages, sleep for a longer random time
                if (sentCount % batchCount === 0) {
                    const batchSleep = Math.random() * (batchSleepMax - batchSleepMin) + batchSleepMin;
                    sendLiveLog(`⏸️ Batch sleep for ${batchSleep.toFixed(1)}s after ${sentCount} messages...`);
                    await new Promise(resolve => setTimeout(resolve, batchSleep * 1000));
                }
                await randomSleep(2, 5);
            } catch (error) {
                sendLiveLog(`❌ Failed to load DM page for ${username}, skipping...`);
                continue;
            }
        } catch (error) {
            sendLiveLog(`❌ Failed to message ${username}: ${error.message}`);
            continue;
        }
        if (sentCount % batchCount === 0) {
            const batchSleep = Math.random() * (batchSleepMax - batchSleepMin) + batchSleepMin;
            sendLiveLog(`⏸️ Batch sleep for ${batchSleep.toFixed(1)}s after ${sentCount} messages...`);
            await new Promise(resolve => setTimeout(resolve, batchSleep * 1000));
        }
    }
    await browser.close();
}

async function checkStopPause(control, browser) {
    if (control.stopped) {
        if (browser) await browser.close();
        throw new Error('Stopped by user');
    }
    while (control.paused) {
        if (control.stopped) {
            if (browser) await browser.close();
            throw new Error('Stopped by user');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

function sendLiveLog(message) {
    if (typeof process.send === 'function') {
        process.send({ type: 'live-log', message });
    } else if (typeof process.emit === 'function') {
        process.emit('live-log', message);
    }
}

module.exports = { sendMessages }; 