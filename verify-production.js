#!/usr/bin/env node

/**
 * Production Verification Script
 * Run this script to verify your production setup is correct
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

let totalChecks = 0;
let passedChecks = 0;
let warnings = [];
let errors = [];

function check(condition, passMessage, failMessage, isWarning = false) {
  totalChecks++;
  if (condition) {
    console.log(`${colors.green}✅ ${passMessage}${colors.reset}`);
    passedChecks++;
    return true;
  } else {
    if (isWarning) {
      console.log(`${colors.yellow}⚠️  ${failMessage}${colors.reset}`);
      warnings.push(failMessage);
    } else {
      console.log(`${colors.red}❌ ${failMessage}${colors.reset}`);
      errors.push(failMessage);
    }
    return false;
  }
}

console.log(`${colors.bold}${colors.blue}
╔════════════════════════════════════════════╗
║        PRODUCTION READINESS CHECK          ║
╚════════════════════════════════════════════╝
${colors.reset}`);

console.log(`${colors.blue}📋 Checking Environment Setup...${colors.reset}\n`);

// 1. Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
check(
  majorVersion >= 16,
  `Node.js version ${nodeVersion} is supported`,
  `Node.js version ${nodeVersion} is too old. Please upgrade to v16 or higher`
);

// 2. Check backend environment files
const backendEnvExists = fs.existsSync(path.join(__dirname, 'backend', '.env'));
const backendEnvProdExists = fs.existsSync(path.join(__dirname, 'backend', '.env.production'));
check(
  backendEnvExists || backendEnvProdExists,
  'Backend environment configuration found',
  'Backend environment file missing. Copy .env.example to .env',
  true
);

// 3. Check frontend environment files
const frontendEnvExists = fs.existsSync(path.join(__dirname, 'frontend', '.env'));
const frontendEnvProdExists = fs.existsSync(path.join(__dirname, 'frontend', '.env.production'));
check(
  frontendEnvExists || frontendEnvProdExists,
  'Frontend environment configuration found',
  'Frontend environment file missing. Copy .env.example to .env',
  true
);

// 4. Check if backend dependencies are installed
const backendNodeModules = fs.existsSync(path.join(__dirname, 'backend', 'node_modules'));
check(
  backendNodeModules,
  'Backend dependencies installed',
  'Backend dependencies not installed. Run: cd backend && npm install'
);

// 5. Check if frontend dependencies are installed
const frontendNodeModules = fs.existsSync(path.join(__dirname, 'frontend', 'node_modules'));
check(
  frontendNodeModules,
  'Frontend dependencies installed',
  'Frontend dependencies not installed. Run: cd frontend && npm install'
);

// 6. Check if backend build exists
const backendDist = fs.existsSync(path.join(__dirname, 'backend', 'dist'));
check(
  backendDist,
  'Backend build found',
  'Backend not built. Run: cd backend && npm run build',
  true
);

// 7. Check if frontend build exists
const frontendBuild = fs.existsSync(path.join(__dirname, 'frontend', 'build'));
check(
  frontendBuild,
  'Frontend production build found',
  'Frontend not built. Run: cd frontend && npm run build',
  true
);

// 8. Check package.json scripts
try {
  const backendPackage = require('./backend/package.json');
  check(
    backendPackage.scripts && backendPackage.scripts.start,
    'Backend production start script configured',
    'Backend production start script missing'
  );
} catch (e) {
  errors.push('Cannot read backend package.json');
}

// 9. Check for sensitive data in repository
const gitignoreExists = fs.existsSync(path.join(__dirname, '.gitignore'));
check(
  gitignoreExists,
  '.gitignore file exists',
  '.gitignore file missing - sensitive files might be exposed!'
);

// 10. Check SSL/Security recommendations
console.log(`\n${colors.blue}🔒 Security Recommendations:${colors.reset}`);
console.log('   • Use HTTPS in production (SSL certificate)');
console.log('   • Change default admin password');
console.log('   • Update JWT secret to a strong random value');
console.log('   • Configure CORS for your domain only');
console.log('   • Enable rate limiting');
console.log('   • Set up regular database backups');

// Summary
console.log(`\n${colors.bold}${colors.blue}═══════════════════════════════════════${colors.reset}`);
console.log(`${colors.bold}📊 Verification Summary:${colors.reset}`);
console.log(`   Checks passed: ${colors.green}${passedChecks}/${totalChecks}${colors.reset}`);

if (warnings.length > 0) {
  console.log(`\n${colors.yellow}⚠️  Warnings (${warnings.length}):${colors.reset}`);
  warnings.forEach(w => console.log(`   • ${w}`));
}

if (errors.length > 0) {
  console.log(`\n${colors.red}❌ Errors (${errors.length}):${colors.reset}`);
  errors.forEach(e => console.log(`   • ${e}`));
}

// Production readiness score
const score = Math.round((passedChecks / totalChecks) * 100);
console.log(`\n${colors.bold}Production Readiness Score: ${
  score >= 80 ? colors.green : score >= 60 ? colors.yellow : colors.red
}${score}%${colors.reset}`);

if (score === 100) {
  console.log(`\n${colors.green}${colors.bold}🎉 Excellent! Your application is production-ready!${colors.reset}`);
} else if (score >= 80) {
  console.log(`\n${colors.green}✅ Good! Your application is mostly ready for production.${colors.reset}`);
  console.log(`${colors.yellow}   Fix the warnings for optimal deployment.${colors.reset}`);
} else if (score >= 60) {
  console.log(`\n${colors.yellow}⚠️  Your application needs some work before production.${colors.reset}`);
  console.log(`${colors.yellow}   Please address the issues listed above.${colors.reset}`);
} else {
  console.log(`\n${colors.red}❌ Your application is not ready for production.${colors.reset}`);
  console.log(`${colors.red}   Please fix the errors before deploying.${colors.reset}`);
}

// Next steps
console.log(`\n${colors.blue}📝 Next Steps:${colors.reset}`);
if (score < 100) {
  console.log('1. Fix any errors listed above');
  console.log('2. Address warnings if possible');
  console.log('3. Run this script again to verify');
} else {
  console.log('1. Run database cleanup: node backend/cleanup-database.js');
  console.log('2. Deploy to your hosting provider');
  console.log('3. Configure domain and SSL');
  console.log('4. Set up monitoring and backups');
}

console.log(`\n${colors.blue}For detailed deployment instructions, see: PRODUCTION_DEPLOYMENT_GUIDE.md${colors.reset}`);
console.log(`${colors.bold}${colors.blue}═══════════════════════════════════════${colors.reset}\n`);

process.exit(errors.length > 0 ? 1 : 0);