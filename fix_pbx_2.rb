require 'xcodeproj'

project_path = 'ios/warrantyApp.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Remove all existing references to GoogleService-Info.plist
project.files.each do |file|
  if file.path && file.path.include?('GoogleService-Info.plist')
    file.remove_from_project
  end
end

target = project.targets.first

# Add the correct file reference with the absolute path or correct relative path
# Since the script is run from ios/, we should add it relative to project root
file_reference = project.main_group.new_reference('warrantyApp/GoogleService-Info.plist')

# Add it to the Copy Bundle Resources phase
resources_phase = target.resources_build_phase
resources_phase.add_file_reference(file_reference)

project.save
