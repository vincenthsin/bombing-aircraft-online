// Simple test script to verify the API endpoints
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
    console.log('Testing Bombing Aircraft Online API...\n');

    // Test user registration
    console.log('1. Testing user registration...');
    try {
        const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            }),
        });

        const registerData = await registerResponse.json();
        console.log('Registration result:', registerData);

        if (!registerData.success) {
            console.log('Registration failed, trying login instead...');
        }

        // Test login
        console.log('\n2. Testing user login...');
        const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'testuser',
                password: 'password123'
            }),
        });

        const loginData = await loginResponse.json();
        console.log('Login result:', loginData);

        if (loginData.success) {
            const token = loginData.token;
            console.log('\n3. Testing authenticated profile request...');
            const profileResponse = await fetch(`${BASE_URL}/api/user/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const profileData = await profileResponse.json();
            console.log('Profile result:', profileData);

            console.log('\n4. Testing game history request...');
            const historyResponse = await fetch(`${BASE_URL}/api/user/recent-games?limit=5`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const historyData = await historyResponse.json();
            console.log('History result:', historyData);
        }

    } catch (error) {
        console.error('API test failed:', error.message);
    }
}

// Run the test
testAPI();