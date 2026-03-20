const axios = require('axios');

const registerStaff = async () => {
  try {
    const response = await axios.post('http://localhost:5001/api/auth/register', {
      fullName: 'Rit',
      email: 'rittik9@gmail.com',
      password: '12345678',
      role: 'staff'
    });

    console.log('✅ Account created successfully!');
    console.log('Token:', response.data.token);
    console.log('User:', response.data.user);
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
    console.error('Full Error:', error.response?.data || error.message);
  }
};

registerStaff();
