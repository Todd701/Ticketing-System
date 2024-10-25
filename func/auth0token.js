const axios = require('axios');

const getAuth0Token = async () => {
    try {
        const response = await axios.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
            client_id: process.env.AUTH0_CLIENT_ID,
            client_secret: process.env.AUTH0_CLIENT_SECRET,
            audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
            grant_type: 'client_credentials',
            scope: 'delete:users'
        });

        return response.data.access_token;
    } catch (error) {
        console.error('Error getting Auth0 token:', error.response ? error.response.data : error.message);
        throw new Error('Failed to obtain Auth0 token');
    }
};

module.exports = { getAuth0Token };