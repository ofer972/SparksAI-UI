@echo off
setlocal enabledelayedexpansion
REM Generic Code Combiner
REM This batch file combines all custom code files into one large file called SparksAI-Combined.txt
REM It automatically finds all files in directories but excludes common non-custom files

echo Creating SparksAI-Combined.txt...
echo Scanning for custom code files...

REM Remove existing combined file if it exists
if exist "SparksAI-Combined.txt" del "SparksAI-Combined.txt"

REM Create header
echo ========================================== > "SparksAI-Combined.txt"
echo SparksAI-UI Project - Combined Code File >> "SparksAI-Combined.txt"
echo Generated on: %date% %time% >> "SparksAI-Combined.txt"
echo ========================================== >> "SparksAI-Combined.txt"
echo. >> "SparksAI-Combined.txt"

REM Function to check if file should be excluded
set "excluded_extensions=.lock .log .cache .tmp .temp .bak .backup .orig .rej .swp .swo .DS_Store"
set "excluded_files=package-lock.json yarn.lock .gitignore SparksAI-Combined.txt .env .env.local .env.development.local .env.test.local .env.production.local"
set "excluded_dirs=node_modules .git .next .vercel .nuxt dist build out coverage .nyc_output .cache"

REM Process root directory files
echo Processing root directory files...
for %%f in (*.*) do (
    set "include_file=true"
    
    REM Check if file is in excluded list
    for %%e in (%excluded_files%) do (
        if "%%f"=="%%e" set "include_file=false"
    )
    
    REM Check file extension
    for %%e in (%excluded_extensions%) do (
        echo %%f | findstr /C:"%%e" >nul && set "include_file=false"
    )
    
    REM Include the file if it passed all checks
    if "!include_file!"=="true" (
        echo Adding: %%f
        echo ========================================== >> "SparksAI-Combined.txt"
        echo FILE: %%f >> "SparksAI-Combined.txt"
        echo ========================================== >> "SparksAI-Combined.txt"
        type "%%f" >> "SparksAI-Combined.txt"
        echo. >> "SparksAI-Combined.txt"
        echo. >> "SparksAI-Combined.txt"
    )
)

REM Process subdirectories recursively
echo Processing subdirectories...
for /d %%d in (*) do (
    set "include_dir=true"
    
    REM Check if directory is excluded
    for %%e in (%excluded_dirs%) do (
        if "%%d"=="%%e" set "include_dir=false"
    )
    
    if "!include_dir!"=="true" (
        echo Processing directory: %%d
        call :ProcessDirectory "%%d" "%%d"
    )
)

REM Add footer
echo. >> "SparksAI-Combined.txt"
echo ========================================== >> "SparksAI-Combined.txt"
echo END OF COMBINED CODE FILE >> "SparksAI-Combined.txt"
echo ========================================== >> "SparksAI-Combined.txt"

echo.
echo SparksAI-Combined.txt has been created successfully!
echo.
echo The file contains all your custom project code in one place.
echo Excluded: node_modules, .git, build files, and other non-custom files.
echo You can now easily share or backup your entire codebase.
echo.
pause
goto :eof

:ProcessDirectory
set "current_dir=%~1"
set "relative_path=%~2"

REM Process files in current directory
for %%f in ("%current_dir%\*.*") do (
    set "filename=%%~nxf"
    set "include_file=true"
    
    REM Check if file is in excluded list
    for %%e in (%excluded_files%) do (
        if "!filename!"=="%%e" set "include_file=false"
    )
    
    REM Check file extension
    for %%e in (%excluded_extensions%) do (
        echo !filename! | findstr /C:"%%e" >nul && set "include_file=false"
    )
    
    REM Include the file if it passed all checks
    if "!include_file!"=="true" (
        echo Adding: %relative_path%\%%~nxf
        echo ========================================== >> "SparksAI-Combined.txt"
        echo FILE: %relative_path%\%%~nxf >> "SparksAI-Combined.txt"
        echo ========================================== >> "SparksAI-Combined.txt"
        type "%%f" >> "SparksAI-Combined.txt"
        echo. >> "SparksAI-Combined.txt"
        echo. >> "SparksAI-Combined.txt"
    )
)

REM Process subdirectories recursively
for /d %%d in ("%current_dir%\*") do (
    set "subdir_name=%%~nd"
    set "include_dir=true"
    
    REM Check if directory is excluded
    for %%e in (%excluded_dirs%) do (
        if "!subdir_name!"=="%%e" set "include_dir=false"
    )
    
    if "!include_dir!"=="true" (
        call :ProcessDirectory "%%d" "%relative_path%\%%~nd"
    )
)
goto :eof
