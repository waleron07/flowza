export const sx = {
  root: {
    minHeight: '100vh',
    backgroundColor: 'background.default',
  },
  appBar: {
    backgroundColor: 'background.paper',
    color: 'text.primary',
    borderBottom: '1px solid',
    borderColor: 'divider',
    boxShadow: 'none',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 2,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  drawerPaper: {
    width: 280,
    boxSizing: 'border-box',
    borderRight: '1px solid',
    borderColor: 'divider',
  },
  drawerContent: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  logoBlock: {
    px: 2,
    py: 2.5,
  },
  navigation: {
    px: 1.5,
    py: 1,
  },
  content: {
    width: '100%',
    flexGrow: 1,
    p: { xs: 2, md: 3 },
  },
} as const
