#!/bin/bash

# Wedding Dashboard Quick Setup Script
# This script helps you get started quickly

set -e

echo "🎉 Wedding Dashboard Setup"
echo "=========================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your:"
    echo "   - DATABASE_URL (from NeonDB)"
    echo "   - AUTH_SECRET (generate with: openssl rand -base64 32)"
    echo ""
    read -p "Press Enter when you've updated .env..."
else
    echo "✅ .env file already exists"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🗄️  Setting up database..."

echo "  → Generating Prisma Client..."
npm run db:generate

echo "  → Running migrations..."
npm run db:migrate

echo "  → Seeding database with default accounts..."
npx prisma db seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Start dev server: npm run dev"
echo "   2. Open http://localhost:3000"
echo "   3. Login with:"
echo "      Super Admin: superadmin@wedding.com / superadmin123"
echo "      Admin:       ivan@wedding.com / admin123"
echo ""
echo "📚 Documentation:"
echo "   - SETUP.md      - Detailed setup guide"
echo "   - README.md     - Full documentation"
echo "   - API.md        - API reference"
echo ""
echo "🚀 Ready to launch!"
