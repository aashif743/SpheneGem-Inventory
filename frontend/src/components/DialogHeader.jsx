import React from 'react';
import { Box, DialogTitle, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Close } from '@mui/icons-material';
import { TOKENS, FONTS } from '../theme';

/**
 * Header for a dialog.
 *
 * On a phone these dialogs open full screen, where a plain text title leaves
 * no obvious way back — the only exit is the Android back button. This gives
 * every sheet a close control in the top-right, pads for the notch, and stays
 * put while the body scrolls.
 */
const DialogHeader = ({ eyebrow, title, onClose }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <DialogTitle
      component="div"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: { xs: 1.5, sm: 2 },
        pt: fullScreen ? 'calc(12px + var(--safe-top))' : undefined,
        bgcolor: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${TOKENS.line}`,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {eyebrow && (
          <Typography variant="eyebrow" sx={{ display: 'block', color: TOKENS.copper }}>
            {eyebrow}
          </Typography>
        )}
        <Typography
          noWrap
          sx={{
            fontFamily: FONTS.DISPLAY,
            fontWeight: 600,
            fontSize: { xs: '1.08rem', sm: '1.2rem' },
            letterSpacing: '-0.01em',
            lineHeight: 1.25,
          }}
        >
          {title}
        </Typography>
      </Box>

      <IconButton
        onClick={onClose}
        aria-label="Close"
        sx={{
          flexShrink: 0,
          width: 40,
          height: 40,
          color: 'text.secondary',
          bgcolor: '#F2F1EC',
          '&:hover': { bgcolor: '#E7E6E0', color: 'text.primary' },
        }}
      >
        <Close sx={{ fontSize: 20 }} />
      </IconButton>
    </DialogTitle>
  );
};

export default DialogHeader;
