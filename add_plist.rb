require 'xcodeproj'
require 'fileutils'

# Move the file
if File.exist?('ios/GoogleService-Info.plist')
  FileUtils.mv('ios/GoogleService-Info.plist', 'ios/warrantyApp/GoogleService-Info.plist')
end

project_path = 'ios/warrantyApp.xcodeproj'
project = Xcodeproj::Project.open(project_path)
main_group = project.main_group.find_subpath('warrantyApp', false) || project.main_group
target = project.targets.first

file_reference = main_group.new_reference('warrantyApp/GoogleService-Info.plist')
target.add_file_references([file_reference])
project.save
