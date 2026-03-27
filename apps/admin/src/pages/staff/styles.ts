export const sx = {
  root: {
    display: 'grid',
    gap: 3,
  },
  header: {
    display: 'grid',
    gap: 1,
  },
  formCard: {
    p: { xs: 2.5, md: 4 },
    borderRadius: 4,
  },
  form: {
    display: 'grid',
    gap: 2,
  },
  fieldsGrid: {
    display: 'grid',
    gap: 2,
    gridTemplateColumns: {
      xs: '1fr',
      md: 'repeat(2, minmax(0, 1fr))',
    },
  },
  submitRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 2,
    flexWrap: 'wrap',
  },
  helperCard: {
    p: 3,
    borderRadius: 4,
  },
  roleList: {
    display: 'grid',
    gap: 1,
    pl: 2.5,
    m: 0,
  },
} as const
