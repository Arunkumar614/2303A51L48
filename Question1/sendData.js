const fs = require('fs');
const axios = require('axios');

const data = JSON.parse(fs.readFileSync('text.txt', 'utf8'));

const apiUrl = 'http://20.244.56.144/evaluation-service/register';

console.log('Sending data:', data);

axios.post(apiUrl, data)
  .then(response => {
    console.log('Success:', response.data);
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