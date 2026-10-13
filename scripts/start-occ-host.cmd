@echo off
rem Starts the OCC training server on this PC for the training LAN, and starts it
rem again if it stops. Close this window to stop the server. See docs\lan-setup.md.
cd /d "%~dp0.."

rem Build when the app or server is missing or older than the simulator files,
rem so the app and server never come from different versions.
node scripts\needs-build.mjs
if errorlevel 1 goto build
goto start

:build
echo Building the training app for this PC...
call npm.cmd run host:build
if errorlevel 1 goto failed

:start
set OCC_BACKEND_HOST=0.0.0.0

:run
node dist-server\main.js
echo.
echo The training server stopped. It starts again in 10 seconds; close this window to stop it.
rem A 10 second pause that works without a console (timeout.exe needs one) and
rem whatever "timeout" Git for Windows puts on the PATH.
"%SystemRoot%\System32\ping.exe" -n 11 127.0.0.1 >nul
goto run

:failed
echo.
echo The build failed. See the messages above.
pause
exit /b 1
