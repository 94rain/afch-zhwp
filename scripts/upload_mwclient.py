"""
upload.py: build and upload the helper script to a wiki (requires mwclient
and git, as well as grunt and the associated dependencies in package.json)

(C) 2014 Theopolisme <theopolismewiki@gmail.com>

Usage
=====

Run from the main afch-rewrite directory:

>>> python scripts/upload.py [site] [root] [username] [password] [--force]

site: enwiki or testwiki

root: Base page name for the script, without any file extension.
      For example, if "MediaWiki:Gadget-afch" was specified the
      script can be loaded from `MediaWiki:Gadget-afch.js`.

username: username of account on site

password: password of account on site (if not provided, a prompt will appear)

force: Flag to indicate that grunt build should be run with --force.
       PLEASE don't use this.
"""
from __future__ import unicode_literals

import sys
import os
import git
import mwclient
import subprocess
import getpass

# Check arg length
if len(sys.argv) < 4:
	print 'Incorrect number of arguments supplied.'
	print 'Usage: python scripts/upload.py [site] [root] [username] [password] [--force]'
	sys.exit(1)

# Shortname of the wiki target
wiki = sys.argv[1]

# First, create a build
command = 'grunt build'

# Should we use --force on grunt build?
if '--force' in sys.argv:
	command += ' --force'
	sys.argv.remove('--force')

print 'Building afch-rewrite using `{}`...'.format(command)

try:
	process = subprocess.Popen(command.split(), stdout=subprocess.PIPE)
	output = process.communicate()[0]
	if output.decode('utf-8').find('Done, without errors.') == -1:
		print 'The following error occurred during the build, so the upload was aborted:'
		print output
		sys.exit(1)
	else:
		print "Build succeeded!"
except OSError:
	print "OSError encountered. Attempting to use os.system..."
	os.system(command)

print 'Uploading to {}...'.format(wiki)

if wiki == 'prod':
	site = mwclient.Site('zh.wikipedia.org')
elif wiki == 'beta':
	site = mwclient.Site('zh.wikipedia.beta.wmflabs.org')
else:
	print 'Error: unrecognized wiki "{}". Must be "zhwiki" or "testwiki".'.format(wiki)
	sys.exit(0)

# Login with username and password
passwd = lambda: getpass.getpass('Password for {} on {}: '.format(sys.argv[3], wiki))
site.login(sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else passwd())

# Base page name on-wiki
root = sys.argv[2]

# Get branch name and the current commit
repo = git.Repo(os.getcwd())
try:
	branch = repo.active_branch
	sha1 = branch.commit.hexsha
except AttributeError:
	branch = next(x for x in repo.branches if x.name == repo.active_branch)
	sha1 = branch.commit.id

# Prepend this to every page
header = '/* Uploaded from https://github.com/94rain/afch-zhwp, commit: {} ({}) */\n'.format(sha1, branch)

def uploadFile(pagename, content):
	page = site.Pages[pagename]

	# Add header and update static referencres to root directory
	content = header + content.decode('utf-8')
	content = content.replace('MediaWiki:Gadget-afch',root)

	def stripFirstLine(text):
		return '\n'.join(text.splitlines()[1:])

	# Only update the page if its contents have changed (excluding the header)
	if stripFirstLine(content) != stripFirstLine(page.text()):
		print 'Uploading to {}'.format(pagename)
		page.save(content, 'Updating AFCH: {} @ {}'.format(branch, sha1[:6]))
	else:
		print 'Skipping {}, no changes made'.format(pagename)

def uploadSubscript(scriptName, content):
	uploadFile(root + '.js/' + scriptName + '.js', content)

def uploadDirectory(directory):
	files = os.listdir(directory)
	for script in files:
		# Skip hidden files and Emacs spam
		if not script.startswith('.') and not script.endswith('~'):
			with open(directory + '/' + script, 'r') as f:
				content = f.read()
			uploadSubscript(os.path.splitext(script)[0], content)

# Upload afch.js
with open('build/afch.js', 'r') as f:
	uploadFile(root + '.js', f.read())

# Upload afch.css
with open('build/afch.css', 'r') as f:
	uploadFile(root + '.css', f.read())

# Now upload everything else: modules, templates
uploadDirectory('build/modules')
uploadDirectory('build/templates')

print 'AFCH uploaded to {} successfully!'.format(wiki)
