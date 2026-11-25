# Gives each page a last_modified_at date, which jekyll-sitemap writes as <lastmod>.
#
# The date is the last git commit of the files that hold the page's content: the page file
# itself, its data JSON (_data/<folderName>/<lang>/<fileName>.json) and the feature and how-to
# images that JSON shows. Scripts and stylesheets don't count, since a shared bug fix doesn't
# change what a page says. Only committed changes count.
#
# Without full git history (a shallow clone) every file would get the same date, so then no
# dates are set at all. A last_modified_at written in a page's front matter always wins.
require "json"
require "open3"
require "time"

Jekyll::Hooks.register :site, :post_read do |site|
  Dir.chdir(site.source) do
    shallow, = Open3.capture2("git", "rev-parse", "--is-shallow-repository")
    next if shallow.strip == "true"

    # Only the main line of history counts (merges compared with their first parent): a change
    # made on a side branch and dropped when it was merged must not date the page. Newest
    # commit first, so the first date seen for a file is its latest change.
    log, status = Open3.capture2("git", "-c", "core.quotepath=off", "log", "-m", "--first-parent", "--format=%cI", "--name-only")
    next unless status.success?

    changed = {}
    commit_time = nil
    log.each_line do |line|
      line = line.strip
      next if line.empty?
      if line.match?(/\A\d{4}-\d\d-\d\dT/)
        commit_time = Time.parse(line)
      else
        changed[line] ||= commit_time
      end
    end
    next if changed.empty?

    site.pages.each do |page|
      next if page.data["last_modified_at"]

      files = [page.relative_path]
      folder, lang, name = page.data.values_at("folderName", "lang", "fileName")
      if folder && lang && name
        json = File.join("_data", folder, lang, "#{name}.json")
        files << json
        begin
          content = JSON.parse(File.read(json))
          images = Array(content["featureHighlights"]).map { |feature| feature["image"] }
          images << content.dig("howTo", "image")
          images.compact.each { |image| files << image.delete_prefix("/") if image.start_with?("/") }
        rescue StandardError
          # no data file or unreadable JSON: the page file's own date is used
        end
      end

      latest = files.map { |file| changed[file] }.compact.max
      page.data["last_modified_at"] = latest if latest
    end
  end
end
