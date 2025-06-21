# Tailwind CSS Documentation

This document provides a summary of Tailwind CSS, focusing on its utility-first fundamentals and integration with Next.js.

## Utility-First Fundamentals

Tailwind CSS is a utility-first CSS framework that provides low-level utility classes to build custom designs without writing custom CSS.

### Core Concepts

*   **Utility Classes**: Single-purpose classes that apply a specific CSS rule (e.g., `text-center`, `bg-blue-500`, `p-4`).
*   **Responsive Design**: Use prefixes like `sm:`, `md:`, `lg:`, `xl:` to apply styles at different breakpoints.
*   **State Variants**: Use prefixes like `hover:`, `focus:`, `active:` to style elements in different states.
*   **Dark Mode**: Use the `dark:` prefix to apply styles when dark mode is enabled.
*   **Arbitrary Values**: Use square bracket notation (e.g., `bg-[#316ff6]`) to apply custom values that are not part of your theme.
*   **Arbitrary Variants**: Use square bracket notation with custom selectors (e.g., `[&>[data-active]+span]:text-blue-600`) for complex styling scenarios.

### Example: Basic Component

```html
<div class="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-md flex items-center space-x-4">
  <div class="flex-shrink-0">
    <img class="h-12 w-12" src="/img/logo.svg" alt="ChitChat Logo">
  </div>
  <div>
    <div class="text-xl font-medium text-black">ChitChat</div>
    <p class="text-gray-500">You have a new message!</p>
  </div>
</div>
```

## Using with Next.js

Integrating Tailwind CSS with Next.js is a straightforward process.

### Installation

Install Tailwind CSS and its peer dependencies via npm:

```bash
npm install -D tailwindcss postcss autoprefixer
```

Then, generate your `tailwind.config.js` and `postcss.config.js` files:

```bash
npx tailwindcss init -p
```

### Configuration

In your `tailwind.config.js`, configure the `content` option to include all the files where you'll be using Tailwind classes:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Include Tailwind in your CSS

In your global CSS file (e.g., `src/app/globals.css`), add the `@tailwind` directives for each of Tailwind's layers.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Project Structure

A common project structure for a Next.js project with Tailwind CSS is to have a `src` directory containing your pages, components, and styles. Assets can be placed in the `public` directory.

```
public/
  img/
src/
  app/
    globals.css
    layout.tsx
    page.tsx
  components/
    ...
tailwind.config.js
postcss.config.js
next.config.js
``` 