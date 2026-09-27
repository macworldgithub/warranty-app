require 'xcodeproj'

project_path = 'ios/warrantyApp.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Remove all existing references to GoogleService-Info.plist
project.files.each do |file|
  if file.path && file.path.include?('GoogleService-Info.plist')
    file.remove_from_project
  end
end

main_group = project.main_group.find_subpath('warrantyApp', false) || project.main_group
target = project.targets.first

# Add the correct file reference
file_reference = main_group.new_reference('GoogleService-Info.plist')
# Add it to the Copy Bundle Resources phase
resources_phase = target.resources_build_phase
resources_phase.add_file_reference(file_reference)

project.save
