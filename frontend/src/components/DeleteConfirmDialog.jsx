import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button
} from '@mui/material';

const DeleteConfirmDialog = ({ open, onClose, onConfirm, itemCode }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle>Confirm Deletion</DialogTitle>
    <DialogContent>
      <Typography>
        Are you sure you want to delete <strong>{itemCode}</strong>?
        This action cannot be undone.
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Cancel</Button>
      <Button onClick={onConfirm} variant="contained" color="error">
        Delete
      </Button>
    </DialogActions>
  </Dialog>
);

export default DeleteConfirmDialog;
