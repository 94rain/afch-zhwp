/* https://github.com/94rain/afch-zhwp, translated and adapted from
 * https://github.com/WPAFC/afch-rewrite */
//<nowiki>
( function ( $, mw ) {
	var subscriptToLoad = false,
		pageName = mw.config.get( 'wgPageName' ).replace( /_/g, ' ' ),

		// `loadMap` determines which scripts should be loaded
		// on each page. Each key is a subscript name and
		// its value is a list of page prefixes on which it
		// should be loaded.

		loadMap = {
			// `submissions.js` is for reviewing textual
			// Articles for Creation submissions.
			submissions: [
				'WikiProject:建立條目/', 'WikiProject_talk:建立條目/', 'User:', 'Draft:'
			]
		};

	$.each( loadMap, function ( script, prefixes ) {
		$.each( prefixes, function ( _, prefix ) {
			if ( pageName.indexOf( prefix ) === 0 ) {
				subscriptToLoad = script;
				return false;
			}
		} );

		// Return false and break out of the loop if already found
		return !!subscriptToLoad;
	} );

	if ( subscriptToLoad ) {
		// Initialize the AFCH object
		window.AFCH = {};

		// Set up constants
		AFCH.consts = {};

		// Master version data
		AFCH.consts.version = '0.9.1';
		AFCH.consts.versionName = 'Imperial Ibex';

		// FIXME: Change when moving into production
		AFCH.consts.beta = true;

		AFCH.consts.scriptpath =
      mw.config.get( 'wgServer' ) + mw.config.get( 'wgScript' );
		AFCH.consts.baseurl = AFCH.consts.scriptpath +
      '?action=raw&ctype=text/javascript&title=User:94rain/js/afch-master.js';

		$.getScript( AFCH.consts.baseurl + '/core.js' ).done( function () {
			var loaded = AFCH.load( subscriptToLoad );
			if ( !loaded ) {
				mw.notify(
					wgULS( 'AFCH无法加载：', 'ARCH無法加載：' ) +
              ( AFCH.error || wgULS( '未知错误', '未知錯誤' ) ),
					{ title: wgULS( 'AFCH错误', 'AFCH錯誤' ) } );
			}
		} );
	}
}( jQuery, mediaWiki ) );
//</nowiki>
