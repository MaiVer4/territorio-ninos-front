#!/bin/bash
set -e

echo "1. Instalando Angular Material..."
npx ng add @angular/material --skip-confirmation --defaults
git add .
git commit -m "build: install angular material"

echo "2. Instalando Tailwind CSS..."
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init
cat << 'CONFIG' > tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
CONFIG

# Prepend Tailwind directives to styles.scss
echo -e "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n$(cat src/styles.scss)" > src/styles.scss

git add .
git commit -m "build: add tailwind css configuration"

echo "3. Estructura de carpetas y Environments..."
mkdir -p src/app/core/{guards,interceptors,services}
mkdir -p src/app/shared/components
mkdir -p src/app/features/auth/{pages,components}
mkdir -p src/environments

cat << 'ENV' > src/environments/environment.ts
export const environment = {
  production: true,
  apiUrl: 'http://localhost:8080/api/v1'
};
ENV

cat << 'ENVDEV' > src/environments/environment.development.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api/v1'
};
ENVDEV

git add .
git commit -m "chore: setup domain folder architecture and environments"

echo "Setup completado exitosamente."
