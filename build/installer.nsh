!macro customInstall
  WriteRegStr HKLM "SOFTWARE\RegisteredApplications" "Anka Web" "SOFTWARE\Clients\StartMenuInternet\Anka Web\Capabilities"

  WriteRegStr HKLM "SOFTWARE\Clients\StartMenuInternet\Anka Web" "" "Anka Web"
  WriteRegStr HKLM "SOFTWARE\Clients\StartMenuInternet\Anka Web\Capabilities" "ApplicationDescription" "Anka Web Tarayıcısı"
  WriteRegStr HKLM "SOFTWARE\Clients\StartMenuInternet\Anka Web\Capabilities" "ApplicationIcon" "$INSTDIR\Anka Web.exe,0"
  WriteRegStr HKLM "SOFTWARE\Clients\StartMenuInternet\Anka Web\Capabilities" "ApplicationName" "Anka Web"

  WriteRegStr HKLM "SOFTWARE\Clients\StartMenuInternet\Anka Web\Capabilities\URLAssociations" "http" "AnkaWebURL"
  WriteRegStr HKLM "SOFTWARE\Clients\StartMenuInternet\Anka Web\Capabilities\URLAssociations" "https" "AnkaWebURL"

  WriteRegStr HKLM "SOFTWARE\Clients\StartMenuInternet\Anka Web\Capabilities\FileAssociations" ".html" "AnkaWebHTML"
  WriteRegStr HKLM "SOFTWARE\Clients\StartMenuInternet\Anka Web\Capabilities\FileAssociations" ".htm" "AnkaWebHTML"
!macroend