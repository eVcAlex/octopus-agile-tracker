import { createTheme, rem } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'violet',
  fontFamily:
    '"Hanken Grotesk Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontFamilyMonospace:
    '"JetBrains Mono Variable", "Fira Code", "SF Mono", Menlo, monospace',
  headings: {
    fontFamily:
      '"Bricolage Grotesque Variable", "Hanken Grotesk Variable", sans-serif',
    fontWeight: '700',
  },
  radius: {
    xs: rem(4),
    sm: rem(6),
    md: rem(10),
    lg: rem(16),
    xl: rem(24),
  },
  defaultRadius: 'md',
  colors: {
    dark: [
      '#C9C9C9',
      '#B8B8B8',
      '#828282',
      '#696969',
      '#424242',
      '#3B3B3B',
      '#2E2E2E',
      '#242424',
      '#1F1F1F',
      '#141414',
    ],
  },
  components: {
    Paper: {
      defaultProps: {
        shadow: 'none',
      },
    },
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    Badge: {
      defaultProps: {
        radius: 'sm',
        variant: 'light',
      },
    },
    Table: {
      defaultProps: {
        verticalSpacing: 'sm',
        horizontalSpacing: 'md',
      },
    },
  },
});
