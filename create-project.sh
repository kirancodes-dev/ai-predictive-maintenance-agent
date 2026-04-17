#!/bin/bash

echo "========================================"
echo "Predictive Maintenance Agent - Setup"
echo "========================================"
echo ""

# Create root directory
PROJECT_ROOT="predictive-maintenance-frontend"
echo "Creating project in: $PROJECT_ROOT"
echo ""

# Create main project structure
mkdir -p "$PROJECT_ROOT"
cd "$PROJECT_ROOT"

echo "Creating folder structure..."
echo ""

# Create all main directories
mkdir -p src/app
mkdir -p public/assets/{fonts,images}
mkdir -p tests/{unit,integration,e2e}

# Create src subdirectories
mkdir -p src/{components,pages,services,hooks,utils,styles,context,types}

# Create component subdirectories
mkdir -p src/components/common/{Header,Sidebar,LoadingSpinner,ErrorBoundary,NotificationToast,ConfirmationModal}
mkdir -p src/components/dashboard/{DashboardOverview,MachineGrid,MetricsChart,RiskIndicator,AlertPanel}
mkdir -p src/components/monitoring/{LiveStream,HistoryView,AnomalyDetection}
mkdir -p src/components/maintenance/{ScheduleMaintenance,MaintenanceHistory,PredictiveInsights}
mkdir -p src/components/settings/{MachineConfig,AlertConfig,UserProfile,SystemSettings}

# Create pages subdirectories
mkdir -p src/pages/{DashboardPage,MachineDetailPage,LiveMonitoringPage,HistoryPage,MaintenancePage,AlertsPage,ReportsPage,SettingsPage,LoginPage,NotFoundPage}

# Create services subdirectories
mkdir -p src/services/{api,websocket,auth}

# Create styles subdirectories
mkdir -p src/styles/themes

echo "✅ Folder structure created successfully!"
echo ""

# Now create all the files
echo "Creating configuration files..."
echo ""

# Create package.json
cat > package.json << 'EOF'
{
  "name": "predictive-maintenance-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@hookform/resolvers": "^3.1.1",
    "@radix-ui/react-dialog": "^1.0.4",
    "@radix-ui/react-dropdown-menu": "^2.0.5",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.6",
    "axios": "^1.4.0",
    "classnames": "^2.3.2",
    "date-fns": "^2.30.0",
    "framer-motion": "^10.12.18",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.45.0",
    "react-hot-toast": "^2.4.1",
    "react-query": "^3.39.3",
    "react-router-dom": "^6.14.0",
    "recharts": "^2.7.0",
    "socket.io-client": "^4.7.0",
    "zod": "^3.21.4",
    "zustand": "^4.3.9"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/react": "^14.0.0",
    "@types/node": "^20.3.3",
    "@types/react": "^18.2.14",
    "@types/react-dom": "^18.2.6",
    "@typescript-eslint/eslint-plugin": "^5.60.1",
    "@typescript-eslint/parser": "^5.60.1",
    "cypress": "^12.16.0",
    "eslint": "^8.43.0",
    "eslint-config-prettier": "^8.8.0",
    "eslint-plugin-react": "^7.32.2",
    "prettier": "^2.8.8",
    "typescript": "^5.1.6",
    "vite": "^4.3.9",
    "vitest": "^0.32.2"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "cypress open",
    "lint": "eslint src --ext ts,tsx",
    "format": "prettier --write 'src/**/*.{ts,tsx,css}'"
  }
}
EOF

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@pages/*": ["src/pages/*"],
      "@services/*": ["src/services/*"],
      "@hooks/*": ["src/hooks/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"],
      "@context/*": ["src/context/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

# Create tsconfig.node.json
cat > tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOF

# Create vite.config.ts
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@context': path.resolve(__dirname, './src/context'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
});
EOF

# Create .env
cat > .env << 'EOF'
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
VITE_AUTH_URL=http://localhost:8000/auth
VITE_ENVIRONMENT=development
VITE_ENABLE_MOCK=false
VITE_LOG_LEVEL=debug
EOF

# Create .env.example
cat > .env.example << 'EOF'
VITE_API_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/ws
VITE_AUTH_URL=http://localhost:8000/auth
VITE_ENVIRONMENT=development
VITE_ENABLE_MOCK=false
VITE_LOG_LEVEL=debug
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
dist/
build/

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Editor
.vscode/
.idea/
*.swp
*.swo

# TypeScript
*.tsbuildinfo
EOF

# Create .eslintrc.js
cat > .eslintrc.js << 'EOF'
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier'
  ],
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
EOF

# Create .prettierrc
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
EOF

# Create index.html
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Predictive Maintenance Agent</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# Create README.md
cat > README.md << 'EOF'
# Predictive Maintenance Agent Frontend

A comprehensive predictive maintenance monitoring system with real-time analytics.

## Features

- 🤖 Autonomous monitoring with failure prediction
- 📊 Real-time sensor data visualization
- 🚨 Intelligent alerting system
- 🔧 Maintenance scheduling and tracking
- 📈 Historical data analysis
- 🎯 Risk score prioritization
- 💬 Plain-English explanations
- 📱 Responsive design

## Tech Stack

- React 18 + TypeScript
- Vite
- Recharts for visualization
- Socket.io for real-time updates
- React Query for data fetching
- Zustand for state management
- React Hook Form + Zod for forms

## Getting Started

1. Install dependencies:
   ```bash
   npm install