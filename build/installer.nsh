SilentInstall silent

!macro customHeader
!macroend

!macro customInit
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File "${BUILD_RESOURCES_DIR}\installer-gui\index.html"
  File "${BUILD_RESOURCES_DIR}\installer-gui\logo.png"
  
  HideWindow
  ExecWait 'mshta.exe "$PLUGINSDIR\index.html"'
!macroend