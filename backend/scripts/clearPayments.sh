#!/bin/bash

# Clear Payment Records Script
echo "🚨 WARNING: This will DELETE ALL payment records from the database!"
echo "This action cannot be undone."
echo ""

# Get API URL from environment or use default
API_URL="${API_URL:-http://localhost:5000/api}"

# Prompt for confirmation
read -p "Are you sure you want to continue? Type 'CLEAR' to confirm: " confirmation

if [ "$confirmation" != "CLEAR" ]; then
    echo "Operation cancelled."
    exit 0
fi

# Prompt for admin token
echo ""
echo "🔑 You need admin authentication to perform this action."
read -p "Enter admin access token: " token

if [ -z "$token" ]; then
    echo "❌ Access token is required."
    exit 1
fi

echo ""
echo "🗑️  Clearing payment records..."

# Make the API call
response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
  -X DELETE \
  -H "Authorization: Bearer $token" \
  -H "Content-Type: application/json" \
  "$API_URL/payments/admin/clear")

# Extract HTTP status code
http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
body=$(echo $response | sed -e 's/HTTPSTATUS\:.*//g')

# Check if request was successful
if [ "$http_code" -eq 200 ]; then
    echo "✅ Payment records cleared successfully!"
    echo "$body" | jq -r '.message'
    
    # Extract and display the counts if jq is available
    if command -v jq &> /dev/null; then
        deleted_count=$(echo "$body" | jq -r '.data.deletedCount')
        previous_total=$(echo "$body" | jq -r '.data.previousTotal')
        echo "   Deleted: $deleted_count payment records"
        echo "   Previous total: $previous_total records"
    fi
    
    echo ""
    echo "📊 Payment & Revenue Analysis dashboard has been cleared."
    echo "   New enrollment attempts will now show up in the Recent Payment Receipts."
else
    echo "❌ Failed to clear payments (HTTP $http_code)"
    if command -v jq &> /dev/null; then
        echo "$body" | jq -r '.message'
    else
        echo "$body"
    fi
    
    if [ "$http_code" -eq 403 ]; then
        echo "   Make sure you are using an admin account token."
    elif [ "$http_code" -eq 0 ]; then
        echo "   Make sure the backend server is running at $API_URL"
    fi
    exit 1
fi