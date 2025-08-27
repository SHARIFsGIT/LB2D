const fetch = require('node-fetch');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function clearPayments() {
  console.log('🚨 WARNING: This will DELETE ALL payment records from the database!');
  console.log('This action cannot be undone.\n');
  
  rl.question('Are you sure you want to continue? Type "CLEAR" to confirm: ', async (answer) => {
    if (answer !== 'CLEAR') {
      console.log('Operation cancelled.');
      rl.close();
      return;
    }

    console.log('\n🔑 You need admin authentication to perform this action.');
    rl.question('Enter admin access token: ', async (token) => {
      try {
        console.log('\n🗑️  Clearing payment records...');
        
        const response = await fetch(`${API_URL}/payments/admin/clear`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();

        if (data.success) {
          console.log('✅ Success!');
          console.log(`   Deleted: ${data.data.deletedCount} payment records`);
          console.log(`   Previous total: ${data.data.previousTotal} records`);
          console.log('\n📊 Payment & Revenue Analysis dashboard has been cleared.');
          console.log('   New enrollment attempts will now show up in the Recent Payment Receipts.');
        } else {
          console.error('❌ Failed to clear payments:', data.message);
          if (response.status === 403) {
            console.error('   Make sure you are using an admin account token.');
          }
        }
      } catch (error) {
        console.error('❌ Network error:', error.message);
        console.error('   Make sure the backend server is running.');
      }

      rl.close();
    });
  });
}

// Run the script
clearPayments();