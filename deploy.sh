#!/bin/bash

# Make this script executable with: chmod +x deploy.sh

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Mob Programming Timer Deployment Script${NC}"
echo "----------------------------------------"

# Build the application
echo -e "${GREEN}Building the application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed. Exiting.${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful!${NC}"
echo ""

# Ask which platform to deploy to
echo "Where would you like to deploy?"
echo "1) Heroku"
echo "2) Vercel"
echo "3) DigitalOcean App Platform"
echo "4) Custom (copy build files only)"
echo "5) Exit"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        # Heroku deployment
        echo -e "${GREEN}Deploying to Heroku...${NC}"
        read -p "Enter your Heroku app name: " heroku_app
        
        # Check if Heroku CLI is installed
        if ! command -v heroku &> /dev/null; then
            echo -e "${RED}Heroku CLI is not installed. Please install it first.${NC}"
            exit 1
        fi
        
        # Check if logged in to Heroku
        heroku whoami &> /dev/null
        if [ $? -ne 0 ]; then
            echo "Please log in to Heroku:"
            heroku login
        fi
        
        # Create Heroku app if it doesn't exist
        heroku apps:info $heroku_app &> /dev/null
        if [ $? -ne 0 ]; then
            echo "Creating Heroku app: $heroku_app"
            heroku create $heroku_app
        fi
        
        # Deploy to Heroku
        git add .
        git commit -m "Deployment to Heroku"
        git push heroku main
        
        echo -e "${GREEN}Deployment to Heroku complete!${NC}"
        echo "Your app is available at: https://$heroku_app.herokuapp.com"
        ;;
    2)
        # Vercel deployment
        echo -e "${GREEN}Deploying to Vercel...${NC}"
        
        # Check if Vercel CLI is installed
        if ! command -v vercel &> /dev/null; then
            echo -e "${RED}Vercel CLI is not installed. Installing...${NC}"
            npm install -g vercel
        fi
        
        # Deploy to Vercel
        vercel
        
        echo -e "${GREEN}Deployment to Vercel initiated!${NC}"
        ;;
    3)
        # DigitalOcean App Platform
        echo -e "${GREEN}Preparing for DigitalOcean App Platform...${NC}"
        echo "Please follow these steps:"
        echo "1. Go to https://cloud.digitalocean.com/apps"
        echo "2. Click 'Create App'"
        echo "3. Connect your GitHub repository"
        echo "4. Configure the build command as 'npm run build'"
        echo "5. Set the run command as 'node server.js'"
        echo "6. Deploy your app"
        
        read -p "Press Enter to continue..."
        ;;
    4)
        # Custom deployment (copy build files)
        echo -e "${GREEN}Preparing build files for custom deployment...${NC}"
        echo "Your build files are in the 'dist' directory."
        echo "Copy these files to your server and run 'node server.js'"
        
        read -p "Press Enter to continue..."
        ;;
    5)
        # Exit
        echo -e "${BLUE}Exiting deployment script.${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo -e "${BLUE}Deployment process completed!${NC}" 