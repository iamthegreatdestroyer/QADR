import { h } from 'vue';
import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import './custom.css';

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // Add custom slots here if needed
    });
  },
  enhanceApp({ app, router, siteData }) {
    // Register custom components here
  },
} satisfies Theme;
