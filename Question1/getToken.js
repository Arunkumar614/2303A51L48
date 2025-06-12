const fs = require('fs');
const axios = require('axios');


const authUrl = 'http://20.244.56.144/evaluation-service/auth'; 


const payload = JSON.parse(fs.readFileSync('auth.txt', 'utf8'));


axios.post(authUrl, payload)
  .then(response => {
    console.log('Authorization Success:', response.data);
  })
  .catch(error => {
    if (error.response) {
      console.error('Error response:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  });