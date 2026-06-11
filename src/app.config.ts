export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/result/index',
    'pages/history/index',
    'pages/compare/index',
    'pages/settings/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#0A0A0A',
    navigationBarTitleText: 'Project Judge',
    navigationBarTextStyle: 'white',
    backgroundColor: '#0A0A0A',
  },
  lazyCodeLoading: 'requiredComponents',
})
