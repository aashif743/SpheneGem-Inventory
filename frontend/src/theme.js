import { createTheme } from '@mui/material/styles';

/**
 * SpheneGem design system.
 *
 * The look is drawn from the gem trade's own artifacts rather than from
 * jewellery advertising: the folded parcel paper stones are stored in, the
 * readout of a precision carat scale, and the hairline rules of a lab
 * certificate. This is a working tool used all day, so it stays quiet and
 * legible; the one indulgence is the light-sweep on dashboard panels.
 *
 * Green and copper are fixed — they come from the Sphene logo and appear on
 * every invoice PDF, so the palette deepens them rather than replacing them.
 */

export const TOKENS = {
  // ── Core ──
  ink:       '#0C1711',  // near-black with a green cast — the jeweller's tray
  inkSoft:   '#16241C',  // raised surfaces on the dark rail
  inkLine:   '#22352A',  // hairlines on dark

  malachite: '#1B5E20',  // brand deep green (invoice header)
  verdant:   '#2E7D32',  // brand mid green
  sprout:    '#43A047',  // brand light green
  jade:      '#E9F2EA',  // pale green wash — zebra rows, selected states
  jadeLine:  '#CBE2CF',  // pale green hairline

  copper:    '#BF7B30',  // brand accent (the "SPHENE" wordmark)
  brass:     '#E3A857',  // lifted copper — highlights, active nav
  copperWash:'#FBF1E4',  // faint copper tint

  parcel:    '#F6F5F0',  // warm paper ground
  surface:   '#FFFFFF',
  line:      '#E4E3DC',  // hairline on light
  lineSoft:  '#EFEEE8',

  text:      '#141A16',
  textMute:  '#5C6660',
  textFaint: '#8B948E',

  // ── Semantic ──
  danger:    '#B3261E',
  dangerWash:'#FDECEA',
  warn:      '#B26A00',
  info:      '#1F5F8B',
};

// Per-metric accents for the dashboard panels. Distinct but all sit inside
// the brand's green/copper world, so the row still reads as one family.
export const METRIC_ACCENTS = {
  stock:   TOKENS.verdant,
  carat:   TOKENS.info,
  sales:   TOKENS.copper,
  revenue: TOKENS.malachite,
};

const FONT_UI      = "'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_DISPLAY = "'Fraunces', 'Iowan Old Style', Georgia, 'Times New Roman', serif";
const FONT_DATA    = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export const FONTS = { UI: FONT_UI, DISPLAY: FONT_DISPLAY, DATA: FONT_DATA };

const theme = createTheme({
  palette: {
    mode: 'light',
    primary:   { main: TOKENS.malachite, light: TOKENS.sprout, dark: '#123F16', contrastText: '#fff' },
    secondary: { main: TOKENS.copper,    light: TOKENS.brass,  dark: '#8F5A1E', contrastText: '#fff' },
    success:   { main: TOKENS.verdant },
    error:     { main: TOKENS.danger },
    warning:   { main: TOKENS.warn },
    info:      { main: TOKENS.info },
    background:{ default: TOKENS.parcel, paper: TOKENS.surface },
    text:      { primary: TOKENS.text, secondary: TOKENS.textMute, disabled: TOKENS.textFaint },
    divider:   TOKENS.line,
  },

  shape: { borderRadius: 12 },

  typography: {
    fontFamily: FONT_UI,

    // Titles carry the personality; body stays neutral so data reads fast.
    h1: { fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: '-0.02em', fontSize: '2.4rem' },
    h2: { fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: '-0.02em', fontSize: '1.95rem' },
    h3: { fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: '-0.015em', fontSize: '1.6rem' },
    h4: { fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: '-0.015em', fontSize: '1.35rem' },
    h5: { fontFamily: FONT_DISPLAY, fontWeight: 600, letterSpacing: '-0.01em',  fontSize: '1.18rem' },
    h6: { fontFamily: FONT_UI,      fontWeight: 700, letterSpacing: '-0.005em', fontSize: '1.02rem' },

    subtitle1: { fontWeight: 600, letterSpacing: '-0.005em' },
    subtitle2: { fontWeight: 600, fontSize: '0.83rem' },
    body1:     { fontSize: '0.925rem', lineHeight: 1.55 },
    body2:     { fontSize: '0.845rem', lineHeight: 1.5 },
    caption:   { fontSize: '0.74rem', color: TOKENS.textMute },
    button:    { fontWeight: 700, letterSpacing: '0.01em', textTransform: 'none' },

    // Small letterspaced label that sits above a value — the certificate voice.
    eyebrow: {
      fontFamily: FONT_UI,
      fontSize: '0.665rem',
      fontWeight: 800,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      lineHeight: 1.4,
      color: TOKENS.textFaint,
    },

    // Every carat weight and price. Tabular figures keep decimal points in a
    // straight column, so a list of weights scans like a scale readout.
    data: {
      fontFamily: FONT_DATA,
      fontVariantNumeric: 'tabular-nums',
      fontFeatureSettings: '"tnum" 1, "zero" 1',
      fontSize: '0.845rem',
      fontWeight: 500,
      letterSpacing: '-0.01em',
    },

    // Hero numerals on the dashboard.
    metric: {
      fontFamily: FONT_DATA,
      fontVariantNumeric: 'tabular-nums',
      fontFeatureSettings: '"tnum" 1',
      fontSize: '1.72rem',
      fontWeight: 600,
      letterSpacing: '-0.035em',
      lineHeight: 1.1,
    },
  },

  // Softer, warmer shadows than MUI's default cool greys.
  shadows: [
    'none',
    '0 1px 2px rgba(12,23,17,0.05)',
    '0 2px 6px rgba(12,23,17,0.06)',
    '0 4px 12px rgba(12,23,17,0.07)',
    '0 6px 18px rgba(12,23,17,0.08)',
    '0 8px 24px rgba(12,23,17,0.09)',
    '0 10px 30px rgba(12,23,17,0.10)',
    '0 12px 36px rgba(12,23,17,0.11)',
    ...Array(17).fill('0 16px 48px rgba(12,23,17,0.12)'),
  ],

  components: {
    MuiTypography: {
      defaultProps: {
        variantMapping: {
          eyebrow: 'span',
          data: 'span',
          metric: 'div',
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: TOKENS.line },
      },
    },

    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${TOKENS.line}`,
          borderRadius: 14,
          transition: 'transform .22s cubic-bezier(.2,.7,.3,1), box-shadow .22s ease, border-color .22s ease',
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 18,
          paddingBlock: 9,
          transition: 'transform .16s cubic-bezier(.2,.7,.3,1), box-shadow .16s ease, background-color .16s ease, border-color .16s ease',
          '&:active': { transform: 'translateY(1px)' },
        },
        containedPrimary: {
          background: `linear-gradient(140deg, ${TOKENS.sprout} 0%, ${TOKENS.malachite} 100%)`,
          boxShadow: '0 2px 8px rgba(27,94,32,0.28)',
          '&:hover': {
            background: `linear-gradient(140deg, #4CAF50 0%, ${TOKENS.verdant} 100%)`,
            boxShadow: '0 6px 18px rgba(27,94,32,0.34)',
          },
        },
        containedSecondary: {
          background: `linear-gradient(140deg, ${TOKENS.brass} 0%, ${TOKENS.copper} 100%)`,
          boxShadow: '0 2px 8px rgba(191,123,48,0.28)',
          '&:hover': {
            background: `linear-gradient(140deg, #E8B46B 0%, #A8691F 100%)`,
            boxShadow: '0 6px 18px rgba(191,123,48,0.34)',
          },
        },
        outlined: { borderWidth: 1.5, '&:hover': { borderWidth: 1.5 } },
        sizeSmall: { paddingInline: 12, paddingBlock: 5, fontSize: '0.78rem' },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 9,
          transition: 'background-color .16s ease, color .16s ease, transform .16s ease',
          '&:hover': { transform: 'translateY(-1px)' },
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: TOKENS.surface,
          transition: 'box-shadow .18s ease, border-color .18s ease',
          '& fieldset': { borderColor: TOKENS.line },
          '&:hover fieldset': { borderColor: TOKENS.jadeLine },
          '&.Mui-focused': { boxShadow: `0 0 0 3px ${TOKENS.jade}` },
          '&.Mui-focused fieldset': { borderColor: TOKENS.verdant, borderWidth: 1.5 },
        },
        // Numbers typed into the app use the same face they're displayed in.
        input: {
          '&[type=number]': {
            fontFamily: FONT_DATA,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.01em',
            // Hide the spinner arrows: they encourage nudging a price by 1
            // when the value should be typed deliberately.
            MozAppearance: 'textfield',
          },
          '&[type=number]::-webkit-outer-spin-button, &[type=number]::-webkit-inner-spin-button': {
            WebkitAppearance: 'none',
            margin: 0,
          },
        },
      },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: '0.88rem', fontWeight: 600, color: TOKENS.textMute },
      },
    },

    MuiFormHelperText: {
      styleOverrides: { root: { marginLeft: 2, fontSize: '0.72rem' } },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            fontFamily: FONT_UI,
            fontSize: '0.685rem',
            fontWeight: 800,
            letterSpacing: '0.11em',
            textTransform: 'uppercase',
            color: TOKENS.textMute,
            backgroundColor: TOKENS.parcel,
            borderBottom: `1px solid ${TOKENS.line}`,
            whiteSpace: 'nowrap',
          },
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${TOKENS.lineSoft}`,
          fontSize: '0.87rem',
          paddingBlock: 12,
        },
        // Right-aligned cells hold numbers — give them the scale readout face.
        // nowrap matters: without it "0.80 ct" breaks after the number and the
        // unit drops to a second line, which destroys the column's alignment.
        alignRight: {
          fontFamily: FONT_DATA,
          fontVariantNumeric: 'tabular-nums',
          fontFeatureSettings: '"tnum" 1',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color .15s ease',
          '&.Mui-selected': { backgroundColor: TOKENS.jade },
          '&.Mui-selected:hover': { backgroundColor: '#DFEDE2' },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700, fontSize: '0.72rem', borderRadius: 7, height: 24 },
        outlined: { borderColor: TOKENS.line },
        label: { paddingInline: 9 },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16, border: `1px solid ${TOKENS.line}` },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: FONT_DISPLAY,
          fontWeight: 600,
          fontSize: '1.2rem',
          letterSpacing: '-0.01em',
          paddingBlock: 18,
        },
      },
    },

    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: {
          backgroundColor: TOKENS.ink,
          fontSize: '0.74rem',
          fontWeight: 600,
          borderRadius: 7,
          paddingInline: 10,
          paddingBlock: 6,
        },
        arrow: { color: TOKENS.ink },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 11, fontWeight: 600 },
        standardError: { backgroundColor: TOKENS.dangerWash, color: TOKENS.danger },
      },
    },

    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: TOKENS.textFaint,
          '&.Mui-checked': { color: TOKENS.copper },
          '&.MuiCheckbox-indeterminate': { color: TOKENS.copper },
        },
      },
    },

    MuiTablePagination: {
      styleOverrides: {
        root: { borderTop: `1px solid ${TOKENS.line}` },
        selectLabel:    { fontSize: '0.79rem', color: TOKENS.textMute },
        displayedRows:  { fontSize: '0.79rem', color: TOKENS.textMute, fontFamily: FONT_DATA },
      },
    },

    MuiAvatar: {
      styleOverrides: { root: { fontFamily: FONT_UI, fontWeight: 700 } },
    },

    MuiDivider: {
      styleOverrides: { root: { borderColor: TOKENS.line } },
    },

    MuiSkeleton: {
      styleOverrides: { root: { backgroundColor: '#ECEBE4', borderRadius: 8 } },
    },
  },
});

export default theme;
