# for buid android project
export ANDROID_HOME=/home/dmkits/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools

# for run android studio AVD and  run Android Emulator
sudo chmod a=rw /dev/kvm

# cordova build
# OR
# cordova build android --release -- --gradleArg=-PcdvMinSdkVersion=19
cordova build

# /home/dmkits/android-studio/bin/studio.sh
# AndroidStudio > Tools > AVD Manager
# and start Your Virtual Device (Nexus 5X API 29 x86)
cordova emulate android
