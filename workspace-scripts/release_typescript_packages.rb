#!/usr/bin/env ruby
# frozen_string_literal: true

require "fileutils"
require "json"
require "net/http"
require "open3"
require "optparse"
require "shellwords"
require "uri"

TYPESCRIPT_REPO = File.expand_path("..", __dir__)
NPM_RELEASE_CONFIRM_TIMEOUT_SECONDS = 10 * 60
NPM_RELEASE_CONFIRM_POLL_SECONDS = 10

PACKAGES = [
  ["tree-haver", "@structuredmerge/tree-haver"],
  ["ast-merge", "@structuredmerge/ast-merge"],
  ["plain-merge", "@structuredmerge/plain-merge"],
  ["json-merge", "@structuredmerge/json-merge"],
  ["yaml-merge", "@structuredmerge/yaml-merge"],
  ["toml-merge", "@structuredmerge/toml-merge"],
  ["markdown-merge", "@structuredmerge/markdown-merge"],
  ["ruby-merge", "@structuredmerge/ruby-merge"],
  ["go-merge", "@structuredmerge/go-merge"],
  ["rust-merge", "@structuredmerge/rust-merge"],
  ["typescript-merge", "@structuredmerge/typescript-merge"],
  ["ast-template", "@structuredmerge/ast-template"],
  ["binary-merge", "@structuredmerge/binary-merge"],
  ["zip-merge", "@structuredmerge/zip-merge"],
  ["js-yaml-merge", "@structuredmerge/js-yaml-merge"],
  ["peggy-toml-merge", "@structuredmerge/peggy-toml-merge"],
  ["markdown-it-merge", "@structuredmerge/markdown-it-merge"],
  ["typescript-compiler-merge", "@structuredmerge/typescript-compiler-merge"],
  ["kettle-nodule", "@structuredmerge/kettle-nodule"],
].freeze

options = {
  push: true,
  push_git: false,
  skip_tests: false,
  tag: false,
}

parser = OptionParser.new do |opts|
  opts.banner = "Usage: release_typescript_packages.rb [options]"

  opts.on("--push", "Publish each package to npm after local validation (default)") do
    options[:push] = true
  end

  opts.on("--no-push", "--dry-run", "Pack and validate locally without publishing to npm") do
    options[:push] = false
  end

  opts.on("--push-git", "After all releases are live, push the TypeScript repo branch and release tag") do
    options[:push_git] = true
  end

  opts.on("--tag", "After all selected releases are live, create a shared vVERSION tag") do
    options[:tag] = true
  end

  opts.on("--skip-tests", "Skip workspace check before packaging") do
    options[:skip_tests] = true
  end

  opts.on("--only PACKAGE", "Release only one npm package name or package directory") do |package_name|
    options[:only] = package_name
  end

  opts.on("--start-at PACKAGE", "Start at an npm package name or package directory in the publish order") do |package_name|
    options[:start_at] = package_name
  end
end

parser.parse!

def sh(cmd)
  Shellwords.join(cmd)
end

def run!(cmd, chdir:)
  puts "\n$ #{sh(cmd)}"
  return if system(*cmd, chdir: chdir)

  raise "Command failed: #{sh(cmd)}"
end

def capture!(cmd, chdir:)
  output, status = Open3.capture2e(*cmd, chdir: chdir)
  raise "Command failed: #{sh(cmd)}\n#{output}" unless status.success?

  output
end

def ensure_clean_git!
  status = capture!(%w[git status --porcelain], chdir: TYPESCRIPT_REPO)
  return if status.empty?

  raise "TypeScript repo has uncommitted changes; commit before releasing.\n#{status}"
end

def package_json(package_dir)
  JSON.parse(File.read(File.join(package_dir, "package.json")))
end

def npm_version_released?(name, version)
  escaped = URI.encode_www_form_component(name)
  uri = URI("https://registry.npmjs.org/#{escaped}/#{URI.encode_www_form_component(version)}")
  response = Net::HTTP.get_response(uri)
  return false if response.is_a?(Net::HTTPNotFound)

  unless response.is_a?(Net::HTTPSuccess)
    raise "Could not check npm release state for #{name}@#{version}: HTTP #{response.code}"
  end

  true
end

def wait_for_npm_release!(name, version)
  deadline = Time.now + NPM_RELEASE_CONFIRM_TIMEOUT_SECONDS
  loop do
    return if npm_version_released?(name, version)

    if Time.now >= deadline
      raise "Release confirmation failed: #{name} #{version} is not live on npm."
    end

    puts "Waiting #{NPM_RELEASE_CONFIRM_POLL_SECONDS}s for #{name} #{version} to become visible on npm..."
    sleep(NPM_RELEASE_CONFIRM_POLL_SECONDS)
  end
end

def tag_exists?(tag_name)
  system("git", "rev-parse", "-q", "--verify", "refs/tags/#{tag_name}",
    chdir: TYPESCRIPT_REPO, out: File::NULL, err: File::NULL)
end

def package_version_minor(version)
  match = version.match(/\A(\d+)\.(\d+)\.\d+(?:[-+].*)?\z/)
  raise "Package version #{version.inspect} is not a simple semver version" unless match

  "#{match[1]}.#{match[2]}"
end

raise "Could not find TypeScript repo at #{TYPESCRIPT_REPO}" unless Dir.exist?(TYPESCRIPT_REPO)

all_packages = PACKAGES.map do |package_dir_name, expected_name|
  package_dir = File.join(TYPESCRIPT_REPO, "packages", package_dir_name)
  raise "Missing package directory: #{package_dir}" unless Dir.exist?(package_dir)

  manifest = package_json(package_dir)
  actual_name = manifest.fetch("name")
  raise "Package order expected #{expected_name}, found #{actual_name}" unless actual_name == expected_name
  raise "#{actual_name} is private; refusing to publish" if manifest["private"]

  { dir_name: package_dir_name, dir: package_dir, name: actual_name, version: manifest.fetch("version") }
end

minor_versions = all_packages.group_by { |package| package_version_minor(package[:version]) }
unless minor_versions.one?
  details = minor_versions.map do |minor, grouped_packages|
    "#{minor}: #{grouped_packages.map { |package| "#{package[:name]}@#{package[:version]}" }.join(", ")}"
  end
  raise "TypeScript packages must share one major.minor version before release.\n#{details.join("\n")}"
end

packages = all_packages.dup
if options[:only]
  packages.select! { |package| package[:dir_name] == options[:only] || package[:name] == options[:only] }
  raise "Unknown package for --only: #{options[:only]}" if packages.empty?
end

if options[:start_at]
  start_index = packages.index { |package| package[:dir_name] == options[:start_at] || package[:name] == options[:start_at] }
  raise "Unknown package for --start-at: #{options[:start_at]}" unless start_index

  packages = packages.drop(start_index)
end

versions = packages.map { |package| package[:version] }.uniq
tag_name = versions.one? ? "v#{versions.first}" : nil

puts "Selected npm packages: #{packages.map { |package| package[:name] }.join(", ")}"
puts "Package versions: #{versions.join(", ")}"
puts "npm publish: #{options[:push] ? "enabled; pass --no-push for local validation only" : "disabled; local validation only"}"

ensure_clean_git! if options[:push] || options[:push_git] || options[:tag]

raise "--tag requires selected packages to share one version; found #{versions.join(", ")}" if options[:tag] && !tag_name
raise "--push-git requires --tag or packages with a shared version" if options[:push_git] && !tag_name

run!(%w[pnpm install --frozen-lockfile], chdir: TYPESCRIPT_REPO)
run!(%w[pnpm run check], chdir: TYPESCRIPT_REPO) unless options[:skip_tests]

pack_dir = File.join(TYPESCRIPT_REPO, "tmp", "release-typescript-packages")
FileUtils.rm_rf(pack_dir)
FileUtils.mkdir_p(pack_dir)

published_packages = []
skipped_packages = []

packages.each do |package|
  puts "\n=== #{package[:name]} #{package[:version]} ==="

  if options[:push] && npm_version_released?(package[:name], package[:version])
    puts "Skipping #{package[:name]} #{package[:version]}; already released on npm."
    skipped_packages << package[:name]
    next
  end

  run!(["pnpm", "--filter", package[:name], "pack", "--pack-destination", pack_dir], chdir: TYPESCRIPT_REPO)
  packed = Dir[File.join(pack_dir, "*.tgz")].max_by { |path| File.mtime(path) }
  raise "No package tarball was produced for #{package[:name]}" unless packed

  run!(["npm", "pack", "--dry-run", packed], chdir: TYPESCRIPT_REPO)

  next unless options[:push]

  print "npm OTP for #{package[:name]} #{package[:version]}: "
  otp_code = STDIN.gets&.chomp.to_s
  raise "npm OTP cannot be empty" if otp_code.empty?

  run!(["pnpm", "--filter", package[:name], "publish", "--access", "public", "--no-git-checks", "--otp", otp_code], chdir: TYPESCRIPT_REPO)
  wait_for_npm_release!(package[:name], package[:version])
  published_packages << package[:name]
end

if options[:push]
  packages.each do |package|
    wait_for_npm_release!(package[:name], package[:version])
  end

  if options[:tag]
    run!(["git", "tag", "-a", tag_name, "-m", "Release TypeScript packages #{versions.first}"], chdir: TYPESCRIPT_REPO) unless tag_exists?(tag_name)
  end

  if options[:push_git]
    run!(%w[git push origin HEAD], chdir: TYPESCRIPT_REPO)
    run!(["git", "push", "origin", tag_name], chdir: TYPESCRIPT_REPO) if options[:tag]
  end

  puts "\nPublished #{published_packages.length} npm package(s): #{published_packages.join(", ")}"
  puts "Skipped #{skipped_packages.length} already-released package(s): #{skipped_packages.join(", ")}" unless skipped_packages.empty?
else
  puts "\nLocal validation complete for #{packages.length} npm package(s); no packages were published."
  puts "Skipping release tag creation because --no-push cannot confirm live releases." if options[:tag]
end
