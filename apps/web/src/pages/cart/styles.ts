export const sx = {
  root: {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 360px' },
    gap: 3,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  item: {
    p: 3,
    borderRadius: 4,
  },
  itemHeader: {
    display: 'flex',
    alignItems: { xs: 'flex-start', sm: 'center' },
    justifyContent: 'space-between',
    gap: 2,
    flexDirection: { xs: 'column', sm: 'row' },
  },
  itemActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mt: 2,
  },
  summary: {
    p: 3,
    borderRadius: 4,
    position: { lg: 'sticky' },
    top: { lg: 100 },
    height: 'fit-content',
  },
  empty: {
    p: 4,
    borderRadius: 4,
    textAlign: 'center',
  },
} as const
