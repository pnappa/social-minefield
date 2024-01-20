import fileinput
import re

# A very hacky file to convert a very reduced subset of HTML blocks to syntax
# highlighted code that can go in a <pre> tag. Do NOT use for user supplied
# input.

# ...I know I know, regex and HTML, oh well!
open_tags = ['<div', '<span', '<h3', '<p', '<header', '<h1']
tag_match = f'({"|".join(open_tags)})'

# Go through each line of stdin, format the code into a pre-tag compatible form,
# and have nice syntax highlighting generated.
for line in fileinput.input():
    # spl = re.split(tag_match, line);
    # for l in spl:
    #     print(l, end='')
    #     if l in open_tags:
    #         print(l.replace('<', '&lt;', end='')

    # Do the string substitution to a) HTML encode < and >, and b) add syntax
    # highlighting.
    # We temporarily replace:
    #  '<' => '`'
    #  '>' => '~'
    #  '=' => '}'
    #  '"' => '|'
    processed_line = line.rstrip().replace('</', '&lt;/`span class}|tag|~')
    processed_line = processed_line.rstrip().replace('<', '&lt;`span class}|tag|~').replace('>', '`/span~&gt;')
    processed_line = processed_line.replace('class=', '`span class}|attribute|~class`/span~}')
    processed_line = processed_line.replace('src=', '`span class}|attribute|~src`/span~}')

    # Replace "blah" with "<span class="string">blah</span>", encoded.
    processed_line = "".join([x if '"' not in x else x.replace('"', '|`span class}|string|~', 1).replace('"', '`/span~|', 1) for x in re.split(r'("[^"]*")', processed_line)])

    print(processed_line.replace('`', '<').replace('~', '>').replace('}', '=').replace('|', '"'))

    
