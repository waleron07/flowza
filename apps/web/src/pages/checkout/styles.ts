export const sx = {
  root: {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 360px' },
    gap: 3,
  },
  card: {
    p: 3,
    borderRadius: 4,
  },
  lineItems: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    mt: 3,
  },
  lineItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    p: 2,
    borderRadius: 3,
    backgroundColor: 'grey.50',
    border: '1px solid',
    borderColor: 'divider',
  },
  sidebar: {
    p: 3,
    borderRadius: 4,
    position: { lg: 'sticky' },
    top: { lg: 100 },
    height: 'fit-content',
  },
} as const
