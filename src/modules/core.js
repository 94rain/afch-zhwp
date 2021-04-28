/* https://github.com/94rain/afch-zhwp, translated and adapted from
 * https://github.com/WPAFC/afch-rewrite */

var Hogan = {};

( function ( Hogan, useArrayBuffer ) {
	Hogan.Template = function ( renderFunc, text, compiler, options ) {
		this.r = renderFunc || this.r;
		this.c = compiler;
		this.options = options;
		this.text = text || '';
		this.buf = ( useArrayBuffer ) ? [] : '';
	};

	Hogan.Template.prototype = {
		// render: replaced by generated code.
		r: function ( context, partials, indent ) {
			return '';
		},

		// variable escaping
		v: hoganEscape,

		// triple stache
		t: coerceToString,

		render: function render( context, partials, indent ) {
			return this.ri( [ context ], partials || {}, indent );
		},

		// render internal -- a hook for overrides that catches partials too
		ri: function ( context, partials, indent ) {
			return this.r( context, partials, indent );
		},

		// tries to find a partial in the curent scope and render it
		rp: function ( name, context, partials, indent ) {
			var partial = partials[ name ];

			if ( !partial ) {
				return '';
			}

			if ( this.c && typeof partial == 'string' ) {
				partial = this.c.compile( partial, this.options );
			}

			return partial.ri( context, partials, indent );
		},

		// render a section
		rs: function ( context, partials, section ) {
			var tail = context[ context.length - 1 ];

			if ( !isArray( tail ) ) {
				section( context, partials, this );
				return;
			}

			for ( var i = 0; i < tail.length; i++ ) {
				context.push( tail[ i ] );
				section( context, partials, this );
				context.pop();
			}
		},

		// maybe start a section
		s: function ( val, ctx, partials, inverted, start, end, tags ) {
			var pass;

			if ( isArray( val ) && val.length === 0 ) {
				return false;
			}

			if ( typeof val == 'function' ) {
				val = this.ls( val, ctx, partials, inverted, start, end, tags );
			}

			pass = ( val === '' ) || !!val;

			if ( !inverted && pass && ctx ) {
				ctx.push( ( typeof val == 'object' ) ? val : ctx[ ctx.length - 1 ] );
			}

			return pass;
		},

		// find values with dotted names
		d: function ( key, ctx, partials, returnFound ) {
			var names = key.split( '.' ),
				val = this.f( names[ 0 ], ctx, partials, returnFound ), cx = null;

			if ( key === '.' && isArray( ctx[ ctx.length - 2 ] ) ) {
				return ctx[ ctx.length - 1 ];
			}

			for ( var i = 1; i < names.length; i++ ) {
				if ( val && typeof val == 'object' && names[ i ] in val ) {
					cx = val;
					val = val[ names[ i ] ];
				} else {
					val = '';
				}
			}

			if ( returnFound && !val ) {
				return false;
			}

			if ( !returnFound && typeof val == 'function' ) {
				ctx.push( cx );
				val = this.lv( val, ctx, partials );
				ctx.pop();
			}

			return val;
		},

		// find values with normal names
		f: function ( key, ctx, partials, returnFound ) {
			var val = false, v = null, found = false;

			for ( var i = ctx.length - 1; i >= 0; i-- ) {
				v = ctx[ i ];
				if ( v && typeof v == 'object' && key in v ) {
					val = v[ key ];
					found = true;
					break;
				}
			}

			if ( !found ) {
				return ( returnFound ) ? false : '';
			}

			if ( !returnFound && typeof val == 'function' ) {
				val = this.lv( val, ctx, partials );
			}

			return val;
		},

		// higher order templates
		ho: function ( val, cx, partials, text, tags ) {
			var compiler = this.c;
			var options = this.options;
			options.delimiters = tags;
			text = val.call( cx, text );
			text = ( text == null ) ? String( text ) : text.toString();
			this.b( compiler.compile( text, options ).render( cx, partials ) );
			return false;
		},

		// template result buffering
		b: ( useArrayBuffer ) ?
			function ( s ) {
				this.buf.push( s );
			} :
			function ( s ) {
				this.buf += s;
			},
		fl: ( useArrayBuffer ) ?
			function () {
				var r = this.buf.join( '' );
				this.buf = [];
				return r;
			} :
			function () {
				var r = this.buf;
				this.buf = '';
				return r;
			},

		// lambda replace section
		ls: function ( val, ctx, partials, inverted, start, end, tags ) {
			var cx = ctx[ ctx.length - 1 ], t = null;

			if ( !inverted && this.c && val.length > 0 ) {
				return this.ho( val, cx, partials, this.text.substring( start, end ), tags );
			}

			t = val.call( cx );

			if ( typeof t == 'function' ) {
				if ( inverted ) {
					return true;
				} else if ( this.c ) {
					return this.ho( t, cx, partials, this.text.substring( start, end ), tags );
				}
			}

			return t;
		},

		// lambda replace variable
		lv: function ( val, ctx, partials ) {
			var cx = ctx[ ctx.length - 1 ];
			var result = val.call( cx );

			if ( typeof result == 'function' ) {
				result = coerceToString( result.call( cx ) );
				if ( this.c && !result.indexOf( '{\u007B' ) ) {
					return this.c.compile( result, this.options ).render( cx, partials );
				}
			}

			return coerceToString( result );
		}

	};

	var rAmp = /&/g, rLt = /</g, rGt = />/g, rApos = /\'/g, rQuot = /\"/g,
		hChars = /[&<>\"\']/;

	function coerceToString( val ) {
		return String( ( val === null || val === undefined ) ? '' : val );
	}

	function hoganEscape( str ) {
		str = coerceToString( str );
		return hChars.test( str ) ? str.replace( rAmp, '&amp;' )
			.replace( rLt, '&lt;' )
			.replace( rGt, '&gt;' )
			.replace( rApos, '&#39;' )
			.replace( rQuot, '&quot;' ) :
			str;
	}

	var isArray = Array.isArray || function ( a ) {
		return Object.prototype.toString.call( a ) === '[object Array]';
	};
}( typeof exports !== 'undefined' ? exports : Hogan ) );

( function ( Hogan ) {
// Setup regex	assignments
// remove whitespace according to Mustache spec
	var rIsWhitespace = /\S/, rQuot = /\"/g, rNewline = /\n/g, rCr = /\r/g,
		rSlash = /\\/g, tagTypes = {
			'#': 1,
			'^': 2,
			'/': 3,
			'!': 4,
			'>': 5,
			'<': 6,
			'=': 7,
			_v: 8,
			'{': 9,
			'&': 10
		};

	Hogan.scan = function scan( text, delimiters ) {
		var len = text.length, IN_TEXT = 0, IN_TAG_TYPE = 1, IN_TAG = 2,
			state = IN_TEXT, tagType = null, tag = null, buf = '', tokens = [],
			seenTag = false, i = 0, lineStart = 0, otag = '{{', ctag = '}}';

		function addBuf() {
			if ( buf.length > 0 ) {
				tokens.push( String( buf ) );
				buf = '';
			}
		}

		function lineIsWhitespace() {
			var isAllWhitespace = true;
			for ( var j = lineStart; j < tokens.length; j++ ) {
				isAllWhitespace =
			( tokens[ j ].tag && tagTypes[ tokens[ j ].tag ] < tagTypes._v ) ||
			( !tokens[ j ].tag && tokens[ j ].match( rIsWhitespace ) === null );
				if ( !isAllWhitespace ) {
					return false;
				}
			}

			return isAllWhitespace;
		}

		function filterLine( haveSeenTag, noNewLine ) {
			addBuf();

			if ( haveSeenTag && lineIsWhitespace() ) {
				for ( var j = lineStart, next; j < tokens.length; j++ ) {
					if ( !tokens[ j ].tag ) {
						if ( ( next = tokens[ j + 1 ] ) && next.tag == '>' ) {
							// set indent to token value
							next.indent = tokens[ j ].toString();
						}
						tokens.splice( j, 1 );
					}
				}
			} else if ( !noNewLine ) {
				tokens.push( { tag: '\n' } );
			}

			seenTag = false;
			lineStart = tokens.length;
		}

		function changeDelimiters( text, index ) {
			var close = '=' + ctag, closeIndex = text.indexOf( close, index ),
				delimiters =
			trim( text.substring( text.indexOf( '=', index ) + 1, closeIndex ) )
				.split( ' ' );

			otag = delimiters[ 0 ];
			ctag = delimiters[ 1 ];

			return closeIndex + close.length - 1;
		}

		if ( delimiters ) {
			delimiters = delimiters.split( ' ' );
			otag = delimiters[ 0 ];
			ctag = delimiters[ 1 ];
		}

		for ( i = 0; i < len; i++ ) {
			if ( state == IN_TEXT ) {
				if ( tagChange( otag, text, i ) ) {
					--i;
					addBuf();
					state = IN_TAG_TYPE;
				} else {
					if ( text.charAt( i ) == '\n' ) {
						filterLine( seenTag );
					} else {
						buf += text.charAt( i );
					}
				}
			} else if ( state == IN_TAG_TYPE ) {
				i += otag.length - 1;
				tag = tagTypes[ text.charAt( i + 1 ) ];
				tagType = tag ? text.charAt( i + 1 ) : '_v';
				if ( tagType == '=' ) {
					i = changeDelimiters( text, i );
					state = IN_TEXT;
				} else {
					if ( tag ) {
						i++;
					}
					state = IN_TAG;
				}
				seenTag = i;
			} else {
				if ( tagChange( ctag, text, i ) ) {
					tokens.push( {
						tag: tagType,
						n: trim( buf ),
						otag: otag,
						ctag: ctag,
						i: ( tagType == '/' ) ? seenTag - ctag.length : i + otag.length
					} );
					buf = '';
					i += ctag.length - 1;
					state = IN_TEXT;
					if ( tagType == '{' ) {
						if ( ctag == '}}' ) {
							i++;
						} else {
							cleanTripleStache( tokens[ tokens.length - 1 ] );
						}
					}
				} else {
					buf += text.charAt( i );
				}
			}
		}

		filterLine( seenTag, true );

		return tokens;
	};

	function cleanTripleStache( token ) {
		if ( token.n.substr( token.n.length - 1 ) === '}' ) {
			token.n = token.n.substring( 0, token.n.length - 1 );
		}
	}

	function trim( s ) {
		if ( s.trim ) {
			return s.trim();
		}

		return s.replace( /^\s*|\s*$/g, '' );
	}

	function tagChange( tag, text, index ) {
		if ( text.charAt( index ) != tag.charAt( 0 ) ) {
			return false;
		}

		for ( var i = 1, l = tag.length; i < l; i++ ) {
			if ( text.charAt( index + i ) != tag.charAt( i ) ) {
				return false;
			}
		}

		return true;
	}

	function buildTree( tokens, kind, stack, customTags ) {
		var instructions = [], opener = null, token = null;

		while ( tokens.length > 0 ) {
			token = tokens.shift();
			if ( token.tag == '#' || token.tag == '^' || isOpener( token, customTags ) ) {
				stack.push( token );
				token.nodes = buildTree( tokens, token.tag, stack, customTags );
				instructions.push( token );
			} else if ( token.tag == '/' ) {
				if ( stack.length === 0 ) {
					throw new Error( 'Closing tag without opener: /' + token.n );
				}
				opener = stack.pop();
				if ( token.n != opener.n && !isCloser( token.n, opener.n, customTags ) ) {
					throw new Error( 'Nesting error: ' + opener.n + ' vs. ' + token.n );
				}
				opener.end = token.i;
				return instructions;
			} else {
				instructions.push( token );
			}
		}

		if ( stack.length > 0 ) {
			throw new Error( 'missing closing tag: ' + stack.pop().n );
		}

		return instructions;
	}

	function isOpener( token, tags ) {
		for ( var i = 0, l = tags.length; i < l; i++ ) {
			if ( tags[ i ].o == token.n ) {
				token.tag = '#';
				return true;
			}
		}
	}

	function isCloser( close, open, tags ) {
		for ( var i = 0, l = tags.length; i < l; i++ ) {
			if ( tags[ i ].c == close && tags[ i ].o == open ) {
				return true;
			}
		}
	}

	Hogan.generate = function ( tree, text, options ) {
		var code = 'var _=this;_.b(i=i||"");' + walk( tree ) + 'return _.fl();';
		if ( options.asString ) {
			return 'function(c,p,i){' + code + ';}';
		}

		return new Hogan.Template(
			new Function( 'c', 'p', 'i', code ), text, Hogan, options );
	};

	function esc( s ) {
		return s.replace( rSlash, '\\\\' )
			.replace( rQuot, '\\\"' )
			.replace( rNewline, '\\n' )
			.replace( rCr, '\\r' );
	}

	function chooseMethod( s ) {
		return ( !s.indexOf( '.' ) ) ? 'd' : 'f';
	}

	function walk( tree ) {
		var code = '';
		for ( var i = 0, l = tree.length; i < l; i++ ) {
			var tag = tree[ i ].tag;
			if ( tag == '#' ) {
				code += section(
					tree[ i ].nodes, tree[ i ].n, chooseMethod( tree[ i ].n ), tree[ i ].i,
					tree[ i ].end, tree[ i ].otag + ' ' + tree[ i ].ctag );
			} else if ( tag == '^' ) {
				code +=
			invertedSection( tree[ i ].nodes, tree[ i ].n, chooseMethod( tree[ i ].n ) );
			} else if ( tag == '<' || tag == '>' ) {
				code += partial( tree[ i ] );
			} else if ( tag == '{' || tag == '&' ) {
				code += tripleStache( tree[ i ].n, chooseMethod( tree[ i ].n ) );
			} else if ( tag == '\n' ) {
				code += text( '"\\n"' + ( tree.length - 1 == i ? '' : ' + i' ) );
			} else if ( tag == '_v' ) {
				code += variable( tree[ i ].n, chooseMethod( tree[ i ].n ) );
			} else if ( tag === undefined ) {
				code += text( '"' + esc( tree[ i ] ) + '"' );
			}
		}
		return code;
	}

	function section( nodes, id, method, start, end, tags ) {
		return 'if(_.s(_.' + method + '("' + esc( id ) + '",c,p,1),' +
		'c,p,0,' + start + ',' + end + ',"' + tags + '")){' +
		'_.rs(c,p,' +
		'function(c,p,_){' + walk( nodes ) + '});c.pop();}';
	}

	function invertedSection( nodes, id, method ) {
		return 'if(!_.s(_.' + method + '("' + esc( id ) + '",c,p,1),c,p,1,0,0,"")){' +
		walk( nodes ) + '};';
	}

	function partial( tok ) {
		return '_.b(_.rp("' + esc( tok.n ) + '",c,p,"' + ( tok.indent || '' ) + '"));';
	}

	function tripleStache( id, method ) {
		return '_.b(_.t(_.' + method + '("' + esc( id ) + '",c,p,0)));';
	}

	function variable( id, method ) {
		return '_.b(_.v(_.' + method + '("' + esc( id ) + '",c,p,0)));';
	}

	function text( id ) {
		return '_.b(' + id + ');';
	}

	Hogan.parse =
	function ( tokens, text, options ) {
		options = options || {};
		return buildTree( tokens, '', [], options.sectionTags || [] );
	};

	Hogan.cache = {};

	Hogan.compile = function ( text, options ) {
		// options
		//
		// asString: false (default)
		//
		// sectionTags: [{o: '_foo', c: 'foo'}]
		// An array of object with o and c fields that indicate names for custom
		// section tags. The example above allows parsing of {{_foo}}{{/foo}}.
		//
		// delimiters: A string that overrides the default delimiters.
		// Example: "<% %>"
		//
		options = options || {};

		var key = text + '||' + !!options.asString;

		var t = this.cache[ key ];

		if ( t ) {
			return t;
		}

		t = this.generate(
			this.parse( this.scan( text, options.delimiters ), text, options ), text,
			options );
		return this.cache[ key ] = t;
	};
}( typeof exports !== 'undefined' ? exports : Hogan ) );

//<nowiki>
( function ( AFCH, $, mw ) {
	$.extend( AFCH, {

		/**
	 * Log anything to the console
	 * @param {anything} thing(s)
	 */
		log: function () {
			var args = Array.prototype.slice.call( arguments );

			if ( AFCH.consts.beta && console && console.log ) {
				args.unshift( 'AFCH:' );
				console.log.apply( console, args );
			}
		},

		/**
	 * @internal Functions called when AFCH.destroy() is run
	 * @type {Array}
	 */
		_destroyFunctions: [],

		/**
	 * Add a function to run when AFCH.destroy() is run
	 * @param {Function} fn
	 */
		addDestroyFunction: function ( fn ) {
			AFCH._destroyFunctions.push( fn );
		},

		/**
	 * Destroys all AFCH-y things. Subscripts can add custom
	 * destroy functions by running AFCH.addDestroyFunction( fn )
	 */
		destroy: function () {
			$.each( AFCH._destroyFunctions, function ( _, fn ) {
				fn();
			} );

			window.AFCH = false;
		},

		/**
	 * Prepares the AFCH gadget by setting constants and checking environment
	 * @return {bool} Whether or not all setup functions executed successfully
	 */
		setup: function () {
			// Check requirements
			if ( 'ajax' in $.support && !$.support.ajax ) {
				AFCH.error = 'AFCH requires AJAX';
				return false;
			}
			AFCH.consts.beta = true;

			AFCH.api = new mw.Api();

			// Set up the preferences interface
			AFCH.preferences = new AFCH.Preferences();
			AFCH.prefs = AFCH.preferences.prefStore;

			// Add more constants -- don't overwrite those already set, though
			AFCH.consts = $.extend(
				{}, {
					// If true, the script will NOT modify actual wiki content and
					// will instead mock all such API requests (success assumed)
					mockItUp: false,
					// Full page name, "Wikipedia talk:Articles for creation/sandbox"
					pagename: mw.config.get( 'wgPageName' ).replace( /_/g, ' ' ),
					// Link to the current page, "/wiki/Wikipedia talk:建立條目專題/沙盒"
					pagelink: mw.util.getUrl(),
					// Used when status is disabled
					nullstatus: {
						update: function () {
							return;
						}
					},
					// Current user
					user: mw.user.getName(),
					// Edit summary ad
					summaryAd: ' ([[WP:AFCH|AFCH]])',
					// Require users to be on whitelist to use the script
					whitelistRequired: true,
					// Name of the whitelist page for reviewers
					whitelistTitle: 'WikiProject:建立條目/參與者'
				},
				AFCH.consts );

			// Check whitelist if necessary, but don't delay loading of the
			// script for users who ARE allowed; rather, just destroy the
			// script instance when and if it finds the user is not listed
			if ( AFCH.consts.whitelistRequired ) {
				AFCH.checkWhitelist();
			}

			return true;
		},

		/**
	 * Check if the current user is allowed to use the helper script;
	 * if not, display an error and destroy AFCH
	 */
		checkWhitelist: function () {
			var user = AFCH.consts.user,
				whitelist = new AFCH.Page( AFCH.consts.whitelistTitle );
			whitelist.getText().done( function ( text ) {
				// sanitizedUser is user, but escaped for use in the regex.
				// Otherwise a user named ... would always be able to use
				// the script, so long as there was a user whose name was
				// three characters long on the list!
				var $howToDisable,
					sanitizedUser =
				user.replace( /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&' ),
					userAllowed =
				( new RegExp( '\\|\\s*' + sanitizedUser + '\\s*}' ) ).test( text );

				if ( !userAllowed ) {
					// If we can detect that the gadget is currently enabled, offer a
					// one-click "disable" link
					if ( mw.user.options.get( 'gadget-afchelper' ) === '1' ) {
						$howToDisable =
				$( '<span>' )
					.append( wgULS( '如果要禁用辅助脚本，', '如果要禁用輔助腳本，' ) )
					.append( $( '<a>' )
						.text( wgULS( '点击这里', '點擊這裡' ) )
						.click( function () {
							// Submit the API request to disable the gadget.
							// Note: We don't use `AFCH.api` here, because
							// AFCH has already been destroyed due to the
							// user not being on the whitelist!
							( new mw.Api() )
								.postWithToken( 'options', {
									action: 'options',
									change: 'gadget-afchelper=0'
								} )
								.done( function ( data ) {
									mw.notify( 'AFCH已被成功禁用。' );
								} );
						} ) )
					.append( '. ' );

						// Otherwise, AFCH is probably installed via common.js/skin.js --
						// offer links for easy access.
					} else {
						$howToDisable = $( '<span>' )
							.append(
								wgULS(
									'如果要禁用帮助程序脚本，则需要手动',
									'如果要禁用幫助程序腳本，則需要手動' ) +
									wgULS( '从你的', '從你的' ) )
							.append( AFCH.makeLinkElementToPage(
								'Special:MyPage/common.js', 'common.js' ) )
							.append( '或' )
							.append( AFCH.makeLinkElementToPage(
								'Special:MyPage/skin.js', 'skin.js' ) )
							.append( wgULS( '页面中移除。', '頁面中移除。' ) );
					}

					// Finally, make and push the notification, then explode AFCH
					mw.notify(
						$( '<div>' )
							.append(
								wgULS( 'AFCH不能加载，"', 'AFCH不能加載，"' ) + user +
					wgULS( '"没有列在', '"沒有列在' ) )
							.append( AFCH.makeLinkElementToPage( whitelist.rawTitle ) )
							.append( wgULS(
								'。您可以在那里申请使用AFC辅助脚本的权限。',
								'。您可以在那裡申請使用AFC輔助腳本的權限。' ) )
							.append( $howToDisable )
							.append( wgULS(
								'如果您有任何问题或疑虑，请', '如果您有任何問題或疑慮，請' ) )
							.append( AFCH.makeLinkElementToPage(
								'WT:AFCH', wgULS( '寻求帮助', '尋求幫助' ) ) )
							.append( '!' ),
						{
							title: wgULS(
								'AFCH错误：用户不在允许列表中',
								'AFCH錯誤：用戶不在允許列表中' ),
							autoHide: false
						} );
					AFCH.destroy();
				}
			} );
		},

		/**
	 * Loads the subscript and dependencies
	 * @param {string} type Which type of script to load:
	 *						'redirects' or 'ffu' or 'submissions'
	 */
		load: function ( type ) {
			if ( !AFCH.setup() ) {
				return false;
			}

			if ( AFCH.consts.beta ) {
				// Load minified css
				mw.loader.load(
					AFCH.consts.scriptpath +
				'?action=raw&ctype=text/css&title=User:94rain/js/afch-master.css',
					'text/css' );
				// Load dependencies
				mw.loader.load( [
					// jquery resources
					'jquery.chosen', 'jquery.spinner', 'jquery.ui',

					// mediawiki.api
					'mediawiki.api', 'mediawiki.api.titleblacklist',

					// mediawiki plugins
					'mediawiki.feedback'
				] );
			}

			// And finally load the subscript
			$.getScript( AFCH.consts.baseurl + '/' + type + '.js' );

			return true;
		},

		/**
	 * Appends a feedback link to the given element
	 * @param {string|jQuery} $element The jQuery element or selector to which the
	 *	 link should be appended
	 * @param {string} type (optional) The part of AFCH that feedback is being
	 *	 given for, e.g. "files for upload"
	 * @param {string} linkText (optional) Text to display in the link; by default
	 *	 "Give feedback!"
	 */
		initFeedback: function ( $element, type, linkText ) {
			var feedback = new mw.Feedback( {
				title: new mw.Title( 'Wikipedia talk:建立條目專題/協助腳本' ),
				bugsLink:
			'https://zh.wikipedia.org/w/index.php?title=WikiProject_talk:建立條目/協助腳本&action=edit&section=new',
				bugsListLink:
			'https://zh.wikipedia.org/w/index.php?title=WikiProject_talk:建立條目/協助腳本'
			} );
			$( '<span>' )
				.text( linkText || wgULS( '提供反馈！', '提供反饋！' ) )
				.addClass( 'feedback-link link' )
				.click( function () {
					feedback.launch( {
						subject: '[' + AFCH.consts.version + '] ' +
				( type ? 'Feedback about ' + type : 'AFCH feedback' )
					} );
				} )
				.appendTo( $element );
		},

		/**
	 * Represents a page, mainly a wrapper for various actions
	 */
		Page: function ( name ) {
			var pg = this;

			this.title = new mw.Title( name );
			this.rawTitle = this.title.getPrefixedText();

			this.additionalData = {};
			this.hasAdditionalData = false;

			this.toString = function () {
				return this.rawTitle;
			};

			this.edit = function ( options ) {
				var deferred = $.Deferred();

				AFCH.actions.editPage( this.rawTitle, options ).done( function ( data ) {
					deferred.resolve( data );
				} );

				return deferred;
			};

			/**
	 * Makes an API request to get a variety of details about the current
	 * revision of the page, which it then sets.
	 * @param {bool} usecache if true, will resolve immediately if function has
	 *						run successfully before
	 * @return {$.Deferred} resolves when data set successfully
	 */
			this._revisionApiRequest = function ( usecache ) {
				var deferred = $.Deferred();

				if ( usecache && pg.hasAdditionalData ) {
					return deferred.resolve();
				}

				AFCH.actions
					.getPageText( this.rawTitle, {
						hide: true,
						moreProps: 'timestamp|user|ids',
						moreParameters: { rvgeneratexml: true }
					} )
					.done( function ( pagetext, data ) {
						// Set internal data
						pg.pageText = pagetext;
						pg.additionalData.lastModified = new Date( data.timestamp );
						pg.additionalData.lastEditor = data.user;
						pg.additionalData.rawTemplateModel = data.parsetree;
						pg.additionalData.revId = data.revid;

						pg.hasAdditionalData = true;

						// Resolve; it's now safe to request this data
						deferred.resolve();
					} );

				return deferred;
			};

			/**
	 * Gets the page text
	 * @param {bool} usecache use cache if possible
	 * @return {string}
	 */
			this.getText = function ( usecache ) {
				var deferred = $.Deferred();

				this._revisionApiRequest( usecache ).done( function () {
					deferred.resolve( pg.pageText );
				} );

				return deferred;
			};

			/**
	 * Gets templates on the page
	 * @return {array} array of objects, each representing a template like
	 *						 {
	 *							 target: 'templateName',
	 *							 params: { 1: 'foo', test: 'go to the {{bar}}' }
	 *						 }
	 */
			this.getTemplates = function () {
				var $templateDom, templates = [], deferred = $.Deferred();

				this._revisionApiRequest( true ).done( function () {
					$templateDom =
			$( $.parseXML( pg.additionalData.rawTemplateModel ) ).find( 'root' );

					// We only want top level templates
					$templateDom.children( 'template' ).each( function () {
						var $el = $( this ),
							data = { target: $el.children( 'title' ).text(), params: {} };

						/**
			 * Essentially, this function takes a template value DOM object, $v,
			 * and removes all signs of XML-ishness. It does this by manipulating
			 * the raw text and doing a few choice string replacements to change
			 * the templates to use wikicode syntax instead. Rather than messing
			 * with recursion and all that mess, /g is our friend...which is
			 * pefectly satisfactory for our purposes.
			 */
						function parseValue( $v ) {
							var text = AFCH.jQueryToHtml( $v );

							// Convert templates to look more template-y
							text = text.replace( /<template>/g, '{{' );
							text = text.replace( /<\/template>/g, '}}' );
							text = text.replace( /<part>/g, '|' );

							// Expand embedded tags (like <nowiki>)
							text = text.replace(
								new RegExp(
									'<ext><name>(.*?)<\\/name>(?:<attr>.*?<\\/attr>)*' +
						'<inner>(.*?)<\\/inner><close>(.*?)<\\/close><\\/ext>',
									'g' ),
								'&lt;$1&gt;$2$3' );

							// Now convert it back to text, removing all the rest of the XML
							// tags
							return $( text ).text();
						}

						$el.children( 'part' ).each( function () {
							var $part = $( this ), $name = $part.children( 'name' ),
								// Use the name if set, or fall back to index if implicitly
								// numbered
								name = $.trim( $name.text() || $name.attr( 'index' ) ),
								value = $.trim( parseValue( $part.children( 'value' ) ) );

							data.params[ name ] = value;
						} );

						templates.push( data );
					} );

					deferred.resolve( templates );
				} );

				return deferred;
			};

			/**
	 * Gets the categories from the page
	 * @param {bool} useApi If true, use the api to get categories, instead of
	 *	 parsing the page. This is
	 *						necessary if you need info about transcluded
	 * categories.
	 * @param {bool} includeCategoryLinks If true, will also include links to
	 *	 categories (e.g. [[:Category:Foo]]).
	 *									Note that if useApi is true,
	 * includeCategoryLinks must be false.
	 * @return {array}
	 */
			this.getCategories = function ( useApi, includeCategoryLinks ) {
				var deferred = $.Deferred(), text = this.pageText;

				if ( useApi ) {
					AFCH.api.getCategories( this.title ).done( function ( categories ) {
						// The api returns mw.Title objects, so we convert them to simple
						// strings before resolving the deferred.
						deferred.resolve( categories ? $.map( categories, function ( cat ) {
							return cat.getPrefixedText();
						} ) : [] );
					} );
					return deferred;
				}

				this._revisionApiRequest( true ).done( function () {
					var catRegex = new RegExp(
							'\\[\\[' + ( includeCategoryLinks ? ':?' : '' ) +
					'Category:(.*?)\\s*\\]\\]',
							'gi' ),
						match = catRegex.exec( text ), categories = [];

					while ( match ) {
						// Name of each category, with first letter capitalized
						categories.push(
							match[ 1 ].charAt( 0 ).toUpperCase() + match[ 1 ].substring( 1 ) );
						match = catRegex.exec( text );
					}

					deferred.resolve( categories );
				} );

				return deferred;
			};

			this.getLastModifiedDate = function () {
				var deferred = $.Deferred();

				this._revisionApiRequest( true ).done( function () {
					deferred.resolve( pg.additionalData.lastModified );
				} );

				return deferred;
			};

			this.getLastEditor = function () {
				var deferred = $.Deferred();

				this._revisionApiRequest( true ).done( function () {
					deferred.resolve( pg.additionalData.lastEditor );
				} );

				return deferred;
			};

			this.getCreator = function () {
				var request, deferred = $.Deferred();

				if ( this.additionalData.creator ) {
					deferred.resolve( this.additionalData.creator );
					return deferred;
				}

				request = {
					action: 'query',
					prop: 'revisions',
					rvprop: 'user',
					rvdir: 'newer',
					rvlimit: 1,
					indexpageids: true,
					titles: this.rawTitle,
					tool: 'AFCH'
				};

				// FIXME: Handle failure more gracefully
				AFCH.api.get( request ).done( function ( data ) {
					var rev, id = data.query.pageids[ 0 ];
					if ( id && data.query.pages[ id ] ) {
						rev = data.query.pages[ id ].revisions[ 0 ];
						pg.additionalData.creator = rev.user;
						deferred.resolve( rev.user );
					} else {
						deferred.reject( data );
					}
				} );

				return deferred;
			};

			this.exists = function () {
				var deferred = $.Deferred();

				AFCH.api.get( { action: 'query', prop: 'info', titles: this.rawTitle } )
					.done( function ( data ) {
						// A nonexistent page will be indexed as '-1'
						if ( data.query.pages.hasOwnProperty( '-1' ) ) {
							deferred.resolve( false );
						} else {
							deferred.resolve( true );
						}
					} );

				return deferred;
			};

			/**
	 * Gets the associated talk page
	 * @return {AFCH.Page}
	 */
			this.getTalkPage = function ( textOnly ) {
				var title, ns = this.title.getNamespaceId();

				// Odd-numbered namespaces are already talk namespaces
				if ( ns % 2 !== 0 ) {
					return this;
				}

				title = new mw.Title( this.title.getMainText(), ns + 1 );

				return new AFCH.Page( title.getPrefixedText() );
			};
		},

		/**
	 * Perform a specific action
	 */
		actions: {
			/**
	 * Gets the full wikicode content of a page
	 * @param {string} pagename The page to get the contents of, namespace
	 *	 included
	 * @param {object} options Object with properties:
	 *							hide: {bool} set to true to hide the API request
	 * in the status log moreProps: {string} additional properties to request,
	 * separated by `|`, moreParameters: {object} additioanl query parameters
	 * @return {$.Deferred} Resolves with pagetext and full data available as
	 *	 parameters
	 */
			getPageText: function ( pagename, options ) {
				var status, request, rvprop = 'content', deferred = $.Deferred();

				if ( !options.hide ) {
					status = new AFCH.status.Element(
						'获取$1...', { $1: AFCH.makeLinkElementToPage( pagename ) } );
				} else {
					status = AFCH.consts.nullstatus;
				}

				if ( options.moreProps ) {
					rvprop += '|' + options.moreProps;
				}

				request = {
					action: 'query',
					prop: 'revisions',
					rvprop: rvprop,
					format: 'json',
					indexpageids: true,
					titles: pagename,
					tool: 'AFCH'
				};

				$.extend( request, options.moreParameters || {} );

				AFCH.api.get( request )
					.done( function ( data ) {
						var rev, id = data.query.pageids[ 0 ];
						if ( id && data.query.pages ) {
							// The page might not exist; resolve with an empty string
							if ( id === '-1' ) {
								deferred.resolve( '', {} );
								return;
							}

							rev = data.query.pages[ id ].revisions[ 0 ];
							deferred.resolve( rev[ '*' ], rev );
							status.update( '已获取$1' );
						} else {
							deferred.reject( data );
							// FIXME: get detailed error info from API result
							status.update( '获取$1失败: ' + JSON.stringify( data ) );
						}
					} )
					.fail( function ( err ) {
						deferred.reject( err );
						status.update( '无法获取$1: ' + JSON.stringify( err ) );
					} );

				return deferred;
			},

			/**
	 * Modifies a page's content
	 * @param {string} pagename The page to be modified, namespace included
	 * @param {object} options Object with properties:
	 *							contents: {string} the text to add to/replace
	 * the page, summary: {string} edit summary, will have the edit summary ad
	 * at the end, createonly: {bool} set to true to only edit the page if it
	 * doesn't exist, mode: {string} 'appendtext' or 'prependtext'; default:
	 * (replace everything) hide: {bool} Set to true to supress logging in
	 * statusWindow statusText: {string} message to show in status; default:
	 * "Editing"
	 * @return {jQuery.Deferred} Resolves if saved with all data
	 */
			editPage: function ( pagename, options ) {
				var status, request, deferred = $.Deferred();

				if ( !options ) {
					options = {};
				}

				if ( !options.hide ) {
					status = new AFCH.status.Element(
						( options.statusText || '正在编辑' ) + '$1...',
						{ $1: AFCH.makeLinkElementToPage( pagename ) } );
				} else {
					status = AFCH.consts.nullstatus;
				}

				request = {
					action: 'edit',
					text: options.contents,
					title: pagename,
					summary: options.summary + AFCH.consts.summaryAd
				};

				// Depending on mode, set appendtext=text or prependtext=text,
				// which overrides the default text option
				if ( options.mode ) {
					request[ options.mode ] = options.contents;
				}

				if ( AFCH.consts.mockItUp ) {
					AFCH.log( request );
					deferred.resolve();
					return deferred;
				}

				AFCH.api.postWithToken( 'edit', request )
					.done( function ( data ) {
						var $diffLink;

						if ( data && data.edit && data.edit.result &&
				data.edit.result === 'Success' ) {
							deferred.resolve( data );

							if ( data.edit.hasOwnProperty( 'nochange' ) ) {
								status.update(
									wgULS( '没有对$1作出任何更改', '沒有對$1作出任何更改' ) );
								return;
							}

							// Create a link to the diff of the edit
							$diffLink = AFCH.makeLinkElementToPage(
								'Special:Diff/' + data.edit.oldrevid + '/' +
										data.edit.newrevid,
								wgULS( '(差异)', '(差異)' ) )
								.addClass( 'text-smaller' );

							status.update( '已保存$1的更改' + AFCH.jQueryToHtml( $diffLink ) );
						} else {
							deferred.reject( data );
							// FIXME: get detailed error info from API result??
							status.update(
								wgULS( '保存$1的更改失败：', '保存$1的更改失敗：' ) +
					JSON.stringify( data ) );
						}
					} )
					.fail( function ( err ) {
						deferred.reject( err );
						status.update(
							wgULS( '保存$1的更改失败：', '保存$1的更改失敗：' ) +
				JSON.stringify( err ) );
					} );

				return deferred;
			},

			/**
	 * Deletes a page
	 * @param	{string} pagename Page to delete
	 * @param	{string} reason	 Reason for deletion; shown in deletion log
	 * @return {$.Deferred} Resolves with success/failure
	 */
			deletePage: function ( pagename, reason ) {
				// FIXME: implement
				return false;
			},

			/**
	 * Moves a page
	 * @param {string} oldTitle Page to move
	 * @param {string} newTitle Move target
	 * @param {string} reason Reason for moving; shown in move log
	 * @param {object} additionalParameters
	 *	 https://www.mediawiki.org/wiki/API:Move#Parameters
	 * @param {bool} hide Don't show the move in the status display
	 * @return {$.Deferred} Resolves with success/failure
	 */
			movePage: function ( oldTitle, newTitle, reason, additionalParameters, hide ) {
				var status, request, deferred = $.Deferred();

				if ( !hide ) {
					status = new AFCH.status.Element(
						wgULS( '正在移动$1至$2...', '正在移動$1至$2...' ), {
							$1: AFCH.makeLinkElementToPage( oldTitle ),
							$2: AFCH.makeLinkElementToPage( newTitle )
						} );
				} else {
					status = AFCH.consts.nullstatus;
				}

				request = $.extend(
					{
						action: 'move',
						from: oldTitle,
						to: newTitle,
						reason: reason + AFCH.consts.summaryAd
					},
					additionalParameters );

				if ( AFCH.consts.mockItUp ) {
					AFCH.log( request );
					deferred.resolve( { to: newTitle } );
					return deferred;
				}

				AFCH.api
					.postWithToken( 'edit', request ) // Move token === edit token
					.done( function ( data ) {
						if ( data && data.move ) {
							status.update( wgULS( '移动$1至$2', '移動$1至$2' ) );
							deferred.resolve( data.move );
						} else {
							// FIXME: get detailed error info from API result??
							status.update(
								wgULS( '移动$1至$2失败：', '移動$1至$2失敗：' ) +
					JSON.stringify( data.error ) );
							deferred.reject( data.error );
						}
					} )
					.fail( function ( err ) {
						status.update(
							wgULS( '移动$1至$2失败：', '移動$1至$2失敗：' ) +
				JSON.stringify( err ) );
						deferred.reject( err );
					} );

				return deferred;
			},

			/**
	 * Notifies a user. Follows redirects and appends a message
	 * to the bottom of the user's talk page.
	 * @param	{string} user
	 * @param	{object} data object with properties
	 *					 - message: {string}
	 *					 - summary: {string}
	 *					 - hide: {bool}, default false
	 * @return {$.Deferred} Resolves with success/failure
	 */
			notifyUser: function ( user, options ) {
				var deferred = $.Deferred(),
					userTalkPage =
				new AFCH.Page( new mw.Title( user, 3 )
					.getPrefixedText() ); // 3 = user talk namespace
				talkPageName = 'User talk:' + user;
				AFCH.api.get( { action: 'query', prop: 'info', titles: talkPageName } )
					.done( function ( data ) {
						var pages = data.query.pages;
						var pageId = Object.keys( pages )[ 0 ];
						var cm = pages[ pageId ].contentmodel;
						if ( cm == 'flow-board' ) {
							AFCH.api.postWithToken( 'csrf', {
								action: 'flow',
								page: talkPageName,
								submodule: 'new-topic',
								nttopic: options.summary,
								ntcontent: options.message,
								ntformat: 'wikitext'
							} );
							var status = new AFCH.status.Element(
								( wgULS( '尝试对结构化讨论页面', '嘗試對結構化討論頁面' ) ) +
						'$1' +
						wgULS(
							'做出了编辑，请检查此次', '做出了編輯，請檢查此次' ) +
						'$2 $3',
								{
									$1: AFCH.makeLinkElementToPage( talkPageName ),
									$2: AFCH.makeLinkElementToPage(
										talkPageName, wgULS( '编辑', ' 編輯' ) ),
									$3: AFCH.makeLinkElementToPage(
										'WT:AFCH', wgULS( '(错误报告)', '(錯誤報告)' ) )
								} );
						} else if ( cm == 'wikitext' ) {
							userTalkPage.exists().done( function ( exists ) {
								userTalkPage.edit( {
									contents: ( exists ? '' : '{{Talk header}}' ) + '\n\n' +
						options.message,
									summary: options.summary || '通知用户',
									mode: 'appendtext',
									statusText: '通知',
									hide: options.hide
								} );
							} );
						} else {
							deferred.rejected();
						}
						deferred.resolved();
					} )
					.fail( function ( data ) {
						deferred.rejected();
					} );
				return deferred;
			},

			/**
	 * Logs a CSD nomination
	 * @param {object} options
	 *					- title {string}
	 *					- reason {string}
	 *					- usersNotified {array} optional
	 * @return {$.Deferred} resolves false if the page did not exist, otherwise
	 *						resolves/rejects with data from the edit
	 */
			logCSD: function ( options ) {
				var deferred = $.Deferred(),
					logPage = new AFCH.Page(
						'User:' + mw.config.get( 'wgUserName' ) + '/' +
				( window.Twinkle && window.Twinkle.getPref( 'speedyLogPageName' ) ||
				'CSD日志' ) );

				// Abort if user disabled in preferences
				if ( !AFCH.prefs.logCsd ) {
					return;
				}

				logPage.getText().done( function ( logText ) {
					var status, date = new Date(),
						headerRe = new RegExp(
							'^==+\\s*' + date.getUTCMonthName() + '\\s+' +
							date.getUTCFullYear() + '\\s*==+',
							'm' ),
						appendText = '';

					// Don't edit if the page has doesn't exist or has no text
					if ( !logText ) {
						deferred.resolve( false );
						return;
					}

					// Add header for new month if necessary
					if ( !headerRe.test( logText ) ) {
						appendText += '\n\n=== ' + date.getUTCMonthName() + ' ' +
				date.getUTCFullYear() + ' ===';
					}

					appendText += '\n# [[:' + options.title + ']]: ' + options.reason;

					if ( options.usersNotified && options.usersNotified.length ) {
						appendText +=
				'; 通知{{user|1=' + options.usersNotified.shift() + '}}';

						$.each( options.usersNotified, function ( _, user ) {
							appendText += ', {{user|1=' + user + '}}';
						} );
					}

					appendText += ' ~~' +
			'~~' +
			'~\n';

					logPage
						.edit( {
							contents: appendText,
							mode: 'appendtext',
							summary: wgULS( '记录对[[', '記錄對[[' ) + options.title +
					']]的快速删除提名',
							statusText: wgULS( '记录快速删除提名', '記錄快速刪除提名' )
						} )
						.done( function ( data ) {
							deferred.resolve( data );
						} )
						.fail( function ( data ) {
							deferred.reject( data );
						} );
				} );

				return deferred;
			},

			/**
	 * If user is allowed, marks a given recentchanges ID as patrolled
	 * @param {string|number} rcid rcid to mark as patrolled
	 * @param {string} title Prettier title to display. If not specified, falls
	 *	 back to just
	 *						 displaying the rcid instead.
	 * @return {$.Deferred}
	 */
			patrolRcid: function ( rcid, title ) {
				var request,
					deferred = $.Deferred(),
					status = new AFCH.status.Element(
						wgULS( '正在将$1标记为已巡查...', '正在將$1標記為已巡查...' ), {
							$1: AFCH.makeLinkElementToPage( title ) || 'page with id #' + rcid
						} );

				request = { action: 'patrol', rcid: rcid };

				if ( AFCH.consts.mockItUp ) {
					AFCH.log( request );
					deferred.resolve();
					return deferred;
				}

				AFCH.api.postWithToken( 'patrol', request )
					.done( function ( data ) {
						if ( data.patrol && data.patrol.rcid ) {
							status.update( '已巡查$1' );
							deferred.resolve( data );
						} else {
							status.update(
								wgULS( '将$1标记为已巡查失败：', '將$1標記為已巡查失敗：' ) +
					JSON.stringify( data.patrol ) );
							deferred.reject( data );
						}
					} )
					.fail( function ( data ) {
						status.update(
							wgULS( '将$1标记为已巡查失败：', '將$1標記為已巡查失敗：' ) +
				JSON.stringify( data ) );
						deferred.reject( data );
					} );

				return deferred;
			}
		},

		/**
	 * Series of functions for logging statuses and whatnot
	 */
		status: {

			/**
	 * Represents the status container, created ub init()
	 */
			container: false,

			/**
	 * Creates the status container
	 * @param	{selector} location String/jQuery selector for where the
	 *							 status container should be prepended
	 */
			init: function ( location ) {
				AFCH.status.container = $( '<div>' )
					.attr( 'id', 'afchStatus' )
					.addClass( 'afchStatus' )
					.prependTo( location || '#mw-content-text' );
			},

			/**
	 * Represents an element in the status container
	 * @param	{string} initialText Initial text of the element
	 * @param {object} substitutions key-value pairs of strings that should be
	 *	 replaced by something
	 *								 else. For example, { '$2':
	 * mw.user.getUser() }. If not redefined, $1 will be equal to the current
	 * page name.
	 */
			Element: function ( initialText, substitutions ) {
				/**
		 * Replace the status element with new html content
		 * @param	{jQuery|string} html Content of the element
		 *								Can use $1 to represent the page name
		 */
				this.update = function ( html ) {
					// Convert to HTML first if necessary
					if ( html.jquery ) {
						html = AFCH.jQueryToHtml( html );
					}

					// First run the substutions
					$.each( this.substitutions, function ( key, value ) {
						// If we are passed a jQuery object, convert it to regular HTML first
						if ( value.jquery ) {
							value = AFCH.jQueryToHtml( value );
						}

						html = html.replace( key, value );
					} );
					// Then update the element
					this.element.html( html );
				};

				/**
		 * Remove the element from the status container
		 */
				this.remove = function () {
					this.update( '' );
				};

				// Sanity check, there better be a status container
				if ( !AFCH.status.container ) {
					AFCH.status.init();
				}

				if ( !substitutions ) {
					substitutions = { $1: AFCH.consts.pagelink };
				} else {
					substitutions = $.extend( {}, { $1: AFCH.consts.pagelink }, substitutions );
				}

				this.substitutions = substitutions;

				this.element = $( '<li>' ).appendTo( AFCH.status.container );

				this.update( initialText );
			}
		},

		msg: {
			/**
	 * AFCH messages loaded by default for all subscripts.
	 * @type {Object}
	 */
			store: {},

			/**
	 * Retrieve the text of a message, or a placeholder if the
	 * message is not set
	 * @param {string} key Message key
	 * @param {object} substitutions replacements to make
	 * @return {string} Message value
	 */
			get: function ( key, substitutions ) {
				var text = AFCH.msg.store[ key ] || '<' + key + '>';

				// Perform substitutions if necessary
				if ( substitutions ) {
					$.each( substitutions, function ( original, replacement ) {
						text = text.replace(
							// Escape the original substitution key, then make it a global
							// regex
							new RegExp(
								original.replace( /[-\/\\^$*+?.()|[\]{}]/g, '\\$&' ), 'g' ),
							replacement );
					} );
				}

				return text;
			},

			/**
	 * Set a new message or messages
	 * @param {string|object} key
	 * @param {string} value if key is a string, value
	 */
			set: function ( key, value ) {
				if ( typeof key === 'object' ) {
					$.extend( AFCH.msg.store, key );
				} else {
					AFCH.msg.store[ key ] = value;
				}
			}
		},

		/**
	 * Store persistent data for the user. Data is stored over
	 * several layers: window-locally, in a variable; broswer-locally,
	 * via localStorage, and finally not-so-locally-at-all, via
	 * mw.user.options.
	 *
	 * == REDUNDANCY, EXPLAINED ==
	 * The reason for this redundancy is because of an obnoxious
	 * little thing called caching. Ideally the script would simply
	 * use mw.user.options, but *apparently* MediaWiki doesn't always
	 * provide the most updated mw.user.options on page load -- in some
	 * instances, it will provide an stale, cached version instead.
	 * This is most certainly a MediaWiki bug, but in the meantime, we
	 * circumvent it by adding numerous layers of redundancy to the whole
	 * getup. In this manner, hopefully by the time we have to rely on
	 * mw.user.options, the cache will have been invalidated and the world
	 * won't explode. *sighs repeatedly* --Theopolisme, 26 May 2014
	 *
	 * @type {Object}
	 */
		userData: {
			/** @internal */
			_prefix: 'userjs-afch-',

			/**
	 * @internal
	 * This is used to cache the updated values of recently set
	 * (through AFCH.userData.set) options, since mw.user.options.get
	 * won't include items set after the page was first loaded.
	 * @type {Object}
	 */
			_optsCache: {},

			/**
	 * Set a value in the data store
	 * @param {string} key
	 * @param {mixed} value
	 * @return {$.Deferred} success
	 */
			set: function ( key, value ) {
				var deferred = $.Deferred(), fullKey = AFCH.userData._prefix + key,
					fullValue = JSON.stringify( value );

				// Update cache so AFCH.userData.get() will have updated
				// information if the page isn't reloaded first. If for
				// some reason the post fails...oh well...
				AFCH.userData._optsCache[ fullKey ] = fullValue;

				// Also update localStorage cache for more redundancy.
				// See note in AFCH.userData docs for why this is necessary.
				if ( window.localStorage ) {
					window.localStorage[ fullKey ] = fullValue;
				}

				AFCH.api
					.postWithToken(
						'options',
						{ action: 'options', optionname: fullKey, optionvalue: fullValue } )
					.done( function ( data ) {
						deferred.resolve( data );
					} );

				return deferred;
			},

			/**
	 * Gets a value from the data store
	 * @param {string} key
	 * @param {mixed} fallback fallback if option not present
	 * @return {mixed} value
	 */
			get: function ( key, fallback ) {
				var value,
					fullKey = AFCH.userData._prefix + key,
					cachedWindow = AFCH.userData._optsCache[ fullKey ],
					cachedLocal = window.localStorage && window.localStorage[ fullKey ];

				// Use cached value if possible, see explanation in AFCH.userData docs.
				value = cachedWindow || cachedLocal;

				if ( value ) {
					return JSON.parse( value );
				}

				// Otherwise just use mw.user.options (with fallback).
				return JSON.parse(
					mw.user.options.get( fullKey, JSON.stringify( fallback || false ) ) );
			}
		},

		/**
	 * AFCH.Preferences is a mechanism for accessing and altering user
	 * preferences in regards to the script.
	 *
	 * Preferences are edited by the user via a jquery.ui dialog and are
	 * saved and persist for the user using AFCH.userData.
	 *
	 * Typical usage:
	 *	AFCH.preferences = new AFCH.Preferences();
	 *	AFCH.preferences.initLink( $( '.put-prefs-link-here' ) );
	 *
	 * @type {object}
	 */
		Preferences: function () {
			var prefs = this;

			/**
	 * Default values for user preferences; details for each preference can be
	 * found inline in `templates/tpl-preferences.html`.
	 * @type {object}
	 */
			this.prefDefaults = {
				autoOpen: false,
				logCsd: true,
				launchLinkPosition: 'p-cactions'
			};

			/**
	 * Current user's preferences
	 * @type {object}
	 */
			this.prefStore =
		$.extend( {}, this.prefDefaults, AFCH.userData.get( 'preferences', {} ) );

			/**
	 * Initializes the preferences modification dialog
	 */
			this.initDialog = function () {
				var $spinner = $.createSpinner( { size: 'large', type: 'block' } )
					.css( 'padding', '20px' );

				if ( !this.$dialog ) {
					// Initialize the $dialog div
					this.$dialog = $( '<div>' );
				}

				// Until we finish lazy-loading the prefs interface,
				// show a spinner in its place.
				this.$dialog.empty().append( $spinner );

				this.$dialog.dialog( {
					width: 500,
					autoOpen: false,
					title: wgULS( 'AFCH参数设置', 'AFCH偏好設定' ),
					modal: true,
					buttons: [
						{
							text: '取消',
							click: function () {
								prefs.$dialog.dialog( 'close' );
							}
						},
						{
							text: wgULS( '保存设置', '保存設置' ),
							click: function () {
								prefs.save();
								prefs.$dialog.empty().append( $spinner );
							}
						}
					]
				} );

				// If we've already fetched the template, render immediately
				if ( this.views ) {
					this.renderMain();
				} else {
					// Otherwise, load the template file and *then* render
					$.ajax( {
						type: 'GET',
						url: AFCH.consts.baseurl + '/tpl-preferences.js',
						dataType: 'text'
					} ).done( function ( data ) {
						prefs.views = new AFCH.Views( data );
						prefs.renderMain();
					} );
				}
			};

			/**
	 * Renders the main preferences menu in the $dialog
	 */
			this.renderMain = function () {
				if ( !( this.views && this.$dialog ) ) {
					return;
				}

				// Empty the dialog and render the preferences view. Provides the values
				// of all of the preferences as variables, as well as an additional few
				// used in other locations.
				this.$dialog.empty().append(
					this.views.renderView( 'preferences', $.extend( {}, this.prefStore, {
						version: AFCH.consts.version,
						versionName: AFCH.consts.versionName,
						userAgent: window.navigator.userAgent
					} ) ) );

				// Manually handle selecting the desired value in <select> menus
				this.$dialog.find( 'select' ).each( function () {
					var $select = $( this ), id = $select.attr( 'id' ),
						value = prefs.prefStore[ id ];
					$select.find( 'option[value="' + value + '"]' ).prop( 'selected', true );
				} );
			};

			/**
	 * Updates prefs based on data in the dialog which
	 * is created in AFCH.preferences.init().
	 */
			this.save = function () {
				// First, hide the buttons so the user won't start multiple actions
				this.$dialog.dialog( { buttons: [] } );

				// Now update the prefStore
				$.extend(
					this.prefStore, AFCH.getFormValues( this.$dialog.find( '.afch-input' ) ) );

				// Set the new userData value
				AFCH.userData.set( 'preferences', this.prefStore ).done( function () {
					// When we're done, close the dialog and notify the user
					prefs.$dialog.dialog( 'close' );
					mw.notify( wgULS(
						'AFCH: 参数设置项保存成功！它们将在当前页面重新加载或浏览其他页面时生效。',
						'AFCH: 偏好設定項保存成功！它們將在當前頁面重新加載或瀏覽其他頁面時生效。' ) );
				} );
			};

			/**
	 * Adds a link to launch the preferences modification dialog
	 *
	 * @param {jQuery} $element element to append the link to
	 * @param {string} linkText text to display in the link
	 */
			this.initLink = function ( $element, linkText ) {
				$( '<span>' )
					.text( linkText || wgULS( '更新设置', '更新設置' ) )
					.addClass( 'preferences-link link' )
					.appendTo( $element )
					.click( function () {
						prefs.initDialog();
						prefs.$dialog.dialog( 'open' );
					} );
			};
		},

		/**
	 * Represents a series of "views", aka templateable thingamajigs.
	 * When creating a set of views, they are loaded from a given piece of
	 * text. Uses <hogan.js>.
	 *
	 * Views on the cheap! Just use one mega template and divide it up into
	 * lots of baby templates :)
	 *
	 * @param {string} [src] text to parse for template contents initially
	 */
		Views: function ( src ) {
			this.views = {};

			this.setView = function ( name, content ) {
				this.views[ name ] = content;
			};

			this.renderView = function ( name, data ) {
				var view = this.views[ name ], template = Hogan.compile( view );

				return template.render( data );
			};

			this.loadFromSrc = function ( src ) {
				var viewRegex = /<!--\s(.*?)\s-->\n([\s\S]*?)<!--\s\/(.*?)\s-->/g,
					match = viewRegex.exec( src );

				while ( match !== null ) {
					var key = match[ 1 ], content = match[ 2 ];

					this.setView( key, content );

					// Increment the match
					match = viewRegex.exec( src );
				}
			};

			this.loadFromSrc( src );
		},

		/**
	 * Represents a specific window into an AFCH.Views object
	 *
	 * @param {AFCH.Views} views location where the views are gleaned
	 * @param {jQuery} $element
	 */
		Viewer: function ( views, $element ) {
			this.views = views;
			this.$element = $element;

			this.previousState = false;

			this.loadView = function ( view, data ) {
				var code = this.views.renderView( view, data );

				// Update the view cache
				this.previousState = this.$element.clone( true );

				this.$element.html( code );
			};

			this.loadPrevious = function () {
				this.$element.replaceWith( this.previousState );
				this.$element = this.previousState;
			};
		},

		/**
	 * Removes a key from a given object and returns the value of the key
	 * @param {string} key
	 * @return {mixed}
	 */
		getAndDelete: function ( object, key ) {
			var v = object[ key ];
			delete object[ key ];
			return v;
		},

		/**
	 * Removes all occurences of a value from an array
	 * @param {array} array
	 * @param {mixed} value
	 */
		removeFromArray: function ( array, value ) {
			var index = $.inArray( value, array );
			while ( index !== -1 ) {
				array.splice( index, 1 );
				index = $.inArray( value, array );
			}
		},

		/**
	 * Gets the values of all elements matched by a selector, including
	 * converting checkboxes to bools, providing textual values of select
	 * elements, ignoring placeholder elements, and more.
	 *
	 * For a radio button group, pass in the container element, which must
	 * be a fieldset with the appropriate "name" attribute. Its id will
	 * be used as the key in the data object.
	 *
	 * @param {jQuery} $selector elements to get values from
	 * @return {object} object of values, with the ids as keys
	 */
		getFormValues: function ( $selector ) {
			var data = {};

			$selector.each( function ( _, element ) {
				var value, allTexts, $element = $( element );

				if ( element.type === 'checkbox' ) {
					value = element.checked;
				} else if ( element.type === 'fieldset' ) {
					value = $element.find( ':checked' ).val();
				} else {
					value = $element.val();

					// Ignore placeholder text
					if ( value === $element.attr( 'placeholder' ) ) {
						value = '';
					}

					// For <select multiple> with nothing selected, jQuery returns null...
					// convert that to an empty array so that $.each() won't explode later
					if ( value === null ) {
						value = [];
					}

					// Also provide the full text of the selected options in <select>.
					// Primary use for this is the edit summary in handleDecline().
					if ( element.nodeName.toLowerCase() === 'select' ) {
						allTexts = [];

						$element.find( 'option:selected' ).each( function () {
							allTexts.push( $( this ).text() );
						} );

						data[ element.id + 'Texts' ] = allTexts;
					}
				}

				data[ element.id ] = value;
			} );

			return data;
		},

		/**
	 * Creates an <a> element that links to a given page.
	 * @param {string} pagename - The title of the page.
	 * @param {string} displayTitle - What gets shown by the link.
	 * @param {boolean} [newTab=true] - Whether to open page in a new tab.
	 * @return {jQuery} <a> element
	 */
		makeLinkElementToPage: function ( pagename, displayTitle, newTab ) {
			var actualTitle = pagename.replace( /_/g, ' ' );

			// newTab is an optional parameter.
			newTab = ( typeof newTab === 'undefined' ) ? true : newTab;

			return $( '<a>' )
				.attr( 'href', mw.util.getUrl( actualTitle ) )
				.attr(
					'id',
					'afch-cat-link-' +
				pagename.toLowerCase().replace( / /g, '-' ).replace( /\//g, '-' ) )
				.attr( 'title', actualTitle )
				.text( displayTitle || actualTitle )
				.attr( 'target', newTab ? '_blank' : '_self' );
		},

		/**
	 * Creates an <a> element that links to a random page in the given category.
	 * @param {string} pagename - The name of the category (without the
	 *	 namespace).
	 * @param {string} displayTitle - What gets shown by the link.
	 * @return {jQuery} <a> element
	 */
		makeLinkElementToCategory: function ( pagename, displayTitle ) {
			var linkElement = AFCH.makeLinkElementToPage(
					'Special:RandomInCategory/' + pagename, displayTitle, false ),
				linkText = displayTitle || pagename.replace( /_/g, ' ' ), request = {
					action: 'query',
					titles: 'Category:' + pagename,
					prop: 'categoryinfo'
				},
				linkSpan = $( '<span>' ).append( linkElement ),
				countSpanId = 'afch-cat-count-' +
		pagename.toLowerCase().replace( / /g, '-' ).replace( /\//g, '-' );

			linkSpan.append( $( '<span>' ).attr( 'id', countSpanId ) );

			AFCH.api.get( request ).done( function ( data ) {
				if ( data.query.pages && !data.query.pages[ '-1' ] ) {
					var pageKey = Object.keys( data.query.pages )[ 0 ],
						pagesCount = data.query.pages[ pageKey ].categoryinfo.pages;
					$( '#' + countSpanId ).text( ' (' + pagesCount + ')' );

					// Disable link if there aren't any pages
					$( '#afch-cat-link-' +
			pagename.toLowerCase().replace( / /g, '-' ).replace( /\//g, '-' ) )
						.replaceWith( displayTitle );
				}
			} );

			return linkSpan;
		},

		/**
	 * Converts [[wikilink]] -> <a>
	 *
	 * @param {string} wikicode
	 * @return {string}
	 */
		convertWikilinksToHTML: function ( wikicode ) {
			var newCode = wikicode, wikilinkRegex = /\[\[(.*?)\s*(?:\|\s*(.*?))?\]\]/g,
				wikilinkMatch = wikilinkRegex.exec( wikicode );

			while ( wikilinkMatch ) {
				var title = wikilinkMatch[ 1 ], displayTitle = wikilinkMatch[ 2 ],
					newLink = AFCH.makeLinkElementToPage( title, displayTitle );

				// Replace the wikilink with the new <a> element
				newCode = newCode.replace( wikilinkMatch[ 0 ], AFCH.jQueryToHtml( newLink ) );

				// Increment match
				wikilinkMatch = wikilinkRegex.exec( wikicode );
			}

			return newCode;
		},

		/**
	 * Returns the relative time that has elapsed between an oldDate and a nowDate
	 * @param {Date|string} old (if it is a string it will be assumed to be a
	 *							 MediaWiki timestamp and converted to a Date
	 * first)
	 * @param {Date} now optional, defaults to `new Date()`
	 * @return {string}
	 */
		relativeTimeSince: function ( old, now ) {
			var oldDate = typeof old === 'object' ? old : AFCH.mwTimestampToDate( old ),
				nowDate = typeof now === 'object' ? now : new Date(),
				msPerMinute = 60 * 1000, msPerHour = msPerMinute * 60,
				msPerDay = msPerHour * 24, msPerMonth = msPerDay * 30,
				msPerYear = msPerDay * 365, elapsed = nowDate - oldDate, amount, unit;

			if ( elapsed < msPerMinute ) {
				amount = Math.round( elapsed / 1000 );
				unit = '秒';
			} else if ( elapsed < msPerHour ) {
				amount = Math.round( elapsed / msPerMinute );
				unit = wgULS( '分钟', '分钟' );
			} else if ( elapsed < msPerDay ) {
				amount = Math.round( elapsed / msPerHour );
				unit = wgULS( '小时', '小時' );
			} else if ( elapsed < msPerMonth ) {
				amount = Math.round( elapsed / msPerDay );
				unit = '天';
			} else if ( elapsed < msPerYear ) {
				amount = Math.round( elapsed / msPerMonth );
				unit = '月';
			} else {
				amount = Math.round( elapsed / msPerYear );
				unit = '年';
			}

			if ( amount !== 1 ) {
				unit += ' ';
			}

			return [ amount, unit, '之前' ].join( ' ' );
		},

		/**
	 * Converts an element into a toggle for another element
	 * @param {string} toggleSelector When clicked, will show/hide elementSelector
	 * @param {string} elementSelector Element(s) to be shown or hidden
	 * @param {string} showText e.g. "Show the div"
	 * @param {string} hideText e.g. "Hide the div"
	 */
		makeToggle: function ( toggleSelector, elementSelector, showText, hideText ) {
			// Remove current click handlers
			$( toggleSelector ).off( 'click' );

			// If show is true, we make the element visible and display hideText in
			// the toggle. Otherwise, we hide the element and display showText.
			function toggleState( show ) {
				$( elementSelector ).toggleClass( 'hidden', !show );
				$( toggleSelector ).text( show ? hideText : showText );
			}

			// Update everythign to match current state of the element
			toggleState( $( elementSelector ).is( ':visible' ) );

			// Add the new click handler
			$( document ).on( 'click', toggleSelector, function () {
				toggleState( $( elementSelector ).hasClass( 'hidden' ) );
			} );
		},

		/**
	 * Gets the full raw HTML content of a jQuery object
	 * @param {jQuery} $element
	 * @return {string}
	 */
		jQueryToHtml: function ( $element ) {
			return $( '<div>' ).append( $element ).html();
		},

		/**
	 * Given a string, returns by default a Date() object
	 * or, if mwstyle is true, a MediaWiki-style timestamp
	 *
	 * If there is no match, return false
	 *
	 * @param {string} string string to parse
	 * @return {Date|integer}
	 */
		parseForTimestamp: function ( string, mwstyle ) {
			var exp, match, date;

			exp = new RegExp(
				'(\\d{1,2}):(\\d{2}), (\\d{1,2}) ' +
			'(1月|2月|3月|4月|5月|6月|7月|8月|9月|10月|11月|12月) ' +
			'(\\d{4}) \\(UTC\\)',
				'g' );

			match = exp.exec( string );

			if ( !match ) {
				return false;
			}

			date = new Date();
			date.setUTCFullYear( match[ 5 ] );
			date.setUTCMonth(
				mw.config.get( 'wgMonthNames' ).indexOf( match[ 4 ] ) -
		1 ); // stupid javascript
			date.setUTCDate( match[ 3 ] );
			date.setUTCHours( match[ 1 ] );
			date.setUTCMinutes( match[ 2 ] );
			date.setUTCSeconds( 0 );

			if ( mwstyle ) {
				return AFCH.dateToMwTimestamp( date );
			}

			return date;
		},

		/**
	 * Parses a MediaWiki internal YYYYMMDDHHMMSS timestamp
	 * @param {string} string
	 * @return {Date|bool} if unable to parse, returns false
	 */
		mwTimestampToDate: function ( string ) {
			var date,
				dateMatches = /(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)/.exec( string );

			// If it *isn't* actually a MediaWiki-style timestamp, pass directly to date
			if ( dateMatches === null ) {
				date = new Date( string );
				// Otherwise use Date.UTC to assemble a date object using UTC time
			} else {
				date = new Date( Date.UTC(
					dateMatches[ 1 ], dateMatches[ 2 ] - 1, dateMatches[ 3 ], dateMatches[ 4 ],
					dateMatches[ 5 ], dateMatches[ 6 ] ) );
			}

			// If invalid, return false
			if ( isNaN( date.getUTCMilliseconds() ) ) {
				return false;
			}

			return date;
		},

		/**
	 * Converts a Date object to YYYYMMDDHHMMSS format
	 * @param {Date} date
	 * @return {number}
	 */
		dateToMwTimestamp: function ( date ) {
			return +(
				date.getUTCFullYear() + ( '0' + ( date.getUTCMonth() + 1 ) ).slice( -2 ) +
		( '0' + date.getUTCDate() ).slice( -2 ) +
		( '0' + date.getUTCHours() ).slice( -2 ) +
		( '0' + date.getUTCMinutes() ).slice( -2 ) +
		( '0' + date.getUTCSeconds() ).slice( -2 ) );
		},

		/**
	 * Returns the value of the specified URL parameter. By default it uses
	 * the current window's address. Optionally you can pass it a custom location.
	 * It returns null if the parameter is not present, or an empty string if the
	 * parameter is empty.
	 *
	 * @param {string} name parameter to get
	 * @param {string} url optional; custom url to search
	 * @return {string|null} value, or null if not present
	 */
		getParam: function () {
			return mw.util.getParamValue.apply( this, arguments );
		},

		/**
	 * Given a code for an AfC decline reason (e.g. "v"), returns some HTML code
	 * describing the reason.
	 *
	 * @param {string} code an AfC decline reason code
	 * @return {$.Deferred} Resolves with the requested HTML
	 */
		getReason: function ( code ) {
			var deferred = $.Deferred();

			$.post(
				'https://zh.wikipedia.org/api/rest_v1/transform/wikitext/to/html',
				'wikitext={{AFC submission/comments|' + code + '}}&body_only=true',
				function ( data ) {
					deferred.resolve( data );
				} );

			return deferred;
		}

	} );
}( AFCH, jQuery, mediaWiki ) );
//</nowiki>
