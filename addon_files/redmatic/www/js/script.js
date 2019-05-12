$(document).ready(() => {
    const bcrypt = dcodeIO.bcrypt;

    const $loglevel = $('#loglevel');
    const $contextStorageDefault = $('#context-storage-default');
    const $contextStorageFilePath = $('#context-storage-file-path');
    const $contextStorageFileInterval = $('#context-storage-file-interval');

    const $adminauthType = $('#adminauth-type');
    const $adminauthCreds = $('#adminauth-credentials');
    const $adminauthExpiry = $('#adminauth-expiry');
    const $adminauthSessionExpiryTime = $('#adminauth-sessionExpiryTime');
    const $adminauthUser = $('#adminauth-user');
    const $adminauthPass1 = $('#adminauth-pass1');
    const $adminauthPass2 = $('#adminauth-pass2');
    const $adminauthSet = $('#adminauth-set');

    const $nodeauthType = $('#nodeauth-type');
    const $nodeauthCreds = $('#nodeauth-credentials');
    const $nodeauthUser = $('#nodeauth-user');
    const $nodeauthPass1 = $('#nodeauth-pass1');
    const $nodeauthPass2 = $('#nodeauth-pass2');
    const $nodeauthSet = $('#nodeauth-set');
    
    const $staticauthType = $('#staticauth-type');
    const $staticauthCreds = $('#staticauth-credentials');
    const $staticauthUser = $('#staticauth-user');
    const $staticauthPass1 = $('#staticauth-pass1');
    const $staticauthPass2 = $('#staticauth-pass2');
    const $staticauthSet = $('#staticauth-set');

    const $projects = $('#projects');
    const $backup = $('#backup');
    
    const $alertSaved = $('#alert-saved');
    const $alertError = $('#alert-error');
    const $alertExec = $('#alert-exec');

    const $status = $('#node-red-status');
    const $memory = $('#node-red-memory');
    const $cpu = $('#node-red-cpu');

    $alertSaved.hide();
    $alertError.hide();
    $alertExec.hide();

    const $restart = $('#restart');
    const $restartSafe = $('#restartSafe');
    const $dropdownRestart = $('#dropdownRestart');
    const $start = $('#start');
    const $startSafe = $('#startSafe');
    const $dropdownStart = $('#dropdownStart');
    const $stop = $('#stop');

    const $linkRed = $('#link-red');
    const $linkUi = $('#link-ui');

    const $packageTable = $('#package-table');

    let config;

    const qs = location.search;
    let sid = '';
    let tmp = qs.match(/sid=(@[0-9a-zA-Z]{10}@)/);
    if (tmp) {
        sid = tmp[1];
        $('#backup').removeClass('disabled').attr('href', 'backup.cgi?sid=' + sid);
    }

    $('a[href="' + (location.hash || '#configuration') + '"]').tab('show');

    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        if(history.pushState) {
            history.pushState(null, null, '#' + $(e.target).attr('href').substr(1));
        } else {
            location.hash = '#' + $(e.target).attr('href').substr(1);
        }
    });

    let psTimeout;
    let psInterval = 5000;

    function checkUpdate() {
        $.getJSON(`update_check.cgi?cmd=versions&sid=${sid}`, (current, success) => {
            $.get(`update_check.cgi?sid=${sid}`, (available, success) => {
                if (current.redmatic !== $.trim(available)) {
                    $('#update-link').html(`<a href="https://github.com/rdmtc/RedMatic/releases/latest" target="_blank">Download Version ${available}</a>`);
                    $('#update-notify').show();
                }
            });
        });

    }

    checkUpdate();

    function pkg() {
        let packages;
        $.get(`pkg.cgi?sid=${sid}&cmd=repo`, data => {
            packages = data;
            $.get(`pkg.cgi?sid=${sid}&cmd=ls`, data => {
                data.split('\n').forEach(line => {
                    if (line && packages[line]) {
                        packages[line].installed = true;
                    }
                });
                $packageTable.html('');
                Object.keys(packages).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).forEach(name => {
                    $packageTable.append(`<tr><td>${name}</td><td>${packages[name].version}</td><td style="text-align: center;">${packages[name].installed ? '✓' : '&nbsp;'}</td><td><button data-pkg="${name}" type="button" class="btn btn-primary btn-sm pkg-install" ${packages[name].installed ? 'disabled' : ''}><span class="spinner-install spinner-border spinner-border-sm" role="status" aria-hidden="true" hidden></span>
  install</button> <button data-pkg="${name}" type="button" class="btn btn-danger btn-sm pkg-remove" ${packages[name].installed ? '' : 'disabled'}><span class="spinner-remove spinner-border spinner-border-sm" role="status" aria-hidden="true" hidden></span>
  remove</button></td></tr>`)
                });
                $('.pkg-install').click(function () {
                    $(this).attr('disabled', true);
                    $(this).find('.spinner-install').removeAttr('hidden');
                    $.get(`pkg.cgi?sid=${sid}&cmd=install&package=${$(this).data('pkg')}`, (data, success) => {
                        $(this).find('.spinner-install').attr('hidden', true);
                        if (data.includes('Done.')) {
                            alert($alertExec);
                        } else {
                            alert($alertError);
                        }
                        pkg();
                    });
                });
                $('.pkg-remove').click(function () {
                    $(this).attr('disabled', true);
                    $(this).find('.spinner-remove').removeAttr('hidden');
                    $.get(`pkg.cgi?sid=${sid}&cmd=remove&package=${$(this).data('pkg')}`, (data, success) => {
                        $(this).find('.spinner-remove').attr('hidden', true);
                        if (data.includes('Done.')) {
                            alert($alertExec);
                        } else {
                            alert($alertError);
                        }
                        pkg();
                    });
                })
            });
        });
    }

    pkg();

    function cpu() {
        $.get(`service.cgi?sid=${sid}&cmd=cpu`, (data, success) => {
            $cpu.html(data ? 'cpu ' + data : '');
        });
    }

    function ps() {
        clearTimeout(psTimeout);
        $.get(`service.cgi?sid=${sid}&cmd=ps`, (data, success) => {
            cpu();
            const lines = data.split('\n');
            let found = false;
            lines.forEach(line => {
                let match;
                match = line.match(/([0-9]+[a-z]?)\s+([0-9]+[a-z]?)\s+node-red\s+node-red/);
                if (match) {
                    let [, vsz, rss] = match;
                    vsz = vsz.replace('m', 'MB').replace('g', 'GB');
                    rss = rss.replace('m', 'MB').replace('g', 'GB');
                    if (!vsz.endsWith('B')) {
                        vsz += 'kB';
                    }
                    if (!rss.endsWith('B')) {
                        rss += 'kB';
                    }
                    $status.html('<span class="status-running">running</span>');
                    $memory.html(`vsz ${vsz}, rss ${rss}`);
                    found = true;
                    $dropdownRestart.removeClass('disabled');
                    $stop.removeClass('disabled');
                    $linkRed.removeClass('disabled');
                    $linkUi.removeClass('disabled');
                    $dropdownStart.addClass('disabled');
                    psInterval = 5000;
                    return;
                }
                match = line.match(/([0-9]+[a-z]?)\s+([0-9]+[a-z]?)\s+.*red.js/);
                if (match) {
                    let [, vsz, rss] = match;
                    vsz = vsz.replace('m', 'MB').replace('g', 'GB');
                    rss = rss.replace('m', 'MB').replace('g', 'GB');
                    if (!vsz.endsWith('B')) {
                        vsz += 'kB';
                    }
                    if (!rss.endsWith('B')) {
                        rss += 'kB';
                    }
                    $status.html('<span class="status-starting">starting</span>');
                    $memory.html(`vsz ${vsz}, rss ${rss}`);
                    found = true;
                    $dropdownRestart.addClass('disabled');
                    $stop.addClass('disabled');
                    $dropdownStart.addClass('disabled');
                    $linkRed.addClass('disabled');
                    $linkUi.addClass('disabled');
                    psInterval = 2500;
                    return;
                }
            });
            if (!found) {
                $status.html('<span class="status-stopped">stopped</span>');
                $memory.html('');
                $dropdownRestart.addClass('disabled');
                $stop.addClass('disabled');
                $dropdownStart.removeClass('disabled');
                $linkRed.addClass('disabled');
                $linkUi.addClass('disabled');
                psInterval = 5000;
            }
            psTimeout = setTimeout(ps, psInterval);
        });
    }

    ps();

    function alert($elem) {
        $elem.show();
        $elem.addClass('show');
        setTimeout(() => {
            $elem.removeClass('show');
            setTimeout(() => {
                $elem.hide();
            }, 200);
        }, 1600);
    }

    function invalidSession() {
        $('#invalidSession').show();
        clearTimeout(psTimeout);
    }

    function save() {
        console.log('save', config)
        $.post({
            url: 'setconfig.cgi' + location.search,
            data: JSON.stringify(config, null, '  '),
            success: function (data) {
                if ($.trim(data) === 'ok') {
                    alert($alertSaved);
                } else {
                    if ($.trim(data) === 'error: invalid session') {
                        invalidSession();
                        return;
                    }
                    alert($alertError);
                }
            }
        }).fail(() => {
            alert($alertError);
        });
    }

    $.get('getconfig.cgi' + location.search, (data, success) => {
        if ($.trim(data) === 'error: invalid session') {
            invalidSession();
            return;
        }
        config = JSON.parse(data);
        $loglevel.val(config.logging.ain.level);

        if (config.adminAuth) {
            $adminauthSessionExpiryTime.val(config.adminAuth.sessionExpiryTime || '604800');
            $adminauthType.val(config.adminAuth.type);
            if (config.adminAuth.type === 'credentials') {
                $adminauthCreds.show();
                $adminauthExpiry.show();
                $adminauthUser.val(config.adminAuth.users[0].username);

            } else if (config.adminAuth.type === 'rega') {
                $adminauthExpiry.show();
            }
        }

        if (config.httpNodeAuth) {
            $nodeauthType.val('basic');
            $nodeauthCreds.show();
            $nodeauthUser.val(config.httpNodeAuth.user);
        }

        if (config.httpStaticAuth) {
            $staticauthType.val('basic');
            $staticauthCreds.show();
            $staticauthUser.val(config.httpStaticAuth.user);
        }

        if (!config.contextStorage) {
            config.contextStorage = {};
        }
        if (!config.contextStorage.default || !config.contextStorage.default.module) {
            config.contextStorage.default = {module: 'memory'};
        }
        if (!config.contextStorage.memory) {
            config.contextStorage.memory = {
                'module': 'memory'
            };
        }
        if (!config.contextStorage.file) {
            config.contextStorage.file = {
                'module': 'localfilesystem'
            };
        }

        if (!config.contextStorage.file.config) {
            config.contextStorage.file.config = {
                dir: '/usr/local/addons/redmatic/var',
                flushInterval: 30
            }
        }

        if (!config.editorTheme) {
            config.editorTheme = {};
        }
        if (!config.editorTheme.projects) {
            config.editorTheme.projects = {};
        }
        config.editorTheme.projects.enabled = config.editorTheme.projects.enabled || false;

        $projects.val(String(config.editorTheme.projects.enabled));

        if (config.editorTheme.projects.enabled) {
            $projects.prop('disabled', true);
        }

        // Migration from 1.x to 2.x
        if (config.contextStorage.default && config.contextStorage.default.module === 'localfilesystem') {
            config.contextStorage.default.module = 'file';
        }

        config.contextStorage.default.module = config.contextStorage.default.module || 'memory';

        updateContextTitle();

        $contextStorageDefault.val(config.contextStorage.default.module);

        $contextStorageFilePath.val(config.contextStorage.file.config.dir);
        $contextStorageFileInterval.val(config.contextStorage.file.config.flushInterval);

        $('#autorestart').find('option[value="' + config.restartOnCrash + '"]').attr('selected', true);
        $('#backup').find('option[value="' + config.ccuBackup + '"]').attr('selected', true);
    });

    $loglevel.change(() => {
        config.logging.ain.level = $loglevel.val();
        save();
    });

    function updateContextTitle() {
        switch (config.contextStorage.default.module) {
            case 'memory':
                $('#context-file-title').html('file');
                $('#context-memory-title').html('default');
                break;
            case 'file':
                $('#context-file-title').html('default');
                $('#context-memory-title').html('memory');
                break;
            default:
        }
    }

    $projects.change(() => {
        config.editorTheme.projects.enabled = $projects.val() === 'true';
        save();
        if (config.editorTheme.projects.enabled) {
            $projects.prop('disabled', true)
        }
    });

    $contextStorageDefault.change(() => {
        if (!config.contextStorage) {
            config.contextStorage = {};
        }
        if (!config.contextStorage.default) {
            config.contextStorage.default = {};
        }

        config.contextStorage.default.module = $contextStorageDefault.val();
        updateContextTitle();

        save();
    });

    $contextStorageFilePath.change(() => {
        config.contextStorage.file.config.dir = $contextStorageFilePath.val();
        save();
    });

    $contextStorageFileInterval.change(() => {
        config.contextStorage.file.config.flushInterval = parseInt($contextStorageFileInterval.val(), 10);
        save();
    });

    $adminauthSessionExpiryTime.change(() => {
        if (!config.adminAuth) {
            config.adminAuth = {};
        }
        const time = parseInt($adminauthSessionExpiryTime.val(), 10) || 604800;
        if (config.adminAuth.sessionExpiryTime !== time) {
            config.adminAuth.sessionExpiryTime = time;
            save();
        }
    });

    $adminauthType.change(() => {
        switch ($adminauthType.val()) {
            case 'credentials':
                $adminauthCreds.show();
                break;
            case 'rega':
                $adminauthExpiry.show();
                $adminauthCreds.hide();
                $adminauthUser.val('');
                if (!config.adminAuth) {
                    config.adminAuth = {};
                }
                delete config.adminAuth.users;
                config.adminAuth.type = 'rega';
                config.adminAuth.sessionExpiryTime = parseInt($adminauthSessionExpiryTime.val(), 10) || 604800;
                save();
                break;
            default:
                $adminauthExpiry.hide();
                $adminauthCreds.hide();
                $adminauthUser.val('');
                delete config.adminAuth;
                save();
        }
    });

    $nodeauthType.change(() => {
        switch ($nodeauthType.val()) {
            case 'basic':
                $nodeauthCreds.show();
                break;
            default:
                $nodeauthCreds.hide();
                $nodeauthUser.val('');
                delete config.httpNodeAuth;
                save();
        }
    });

    $staticauthType.change(() => {
        switch ($staticauthType.val()) {
            case 'basic':
                $staticauthCreds.show();
                break;
            default:
                $staticauthCreds.hide();
                $staticauthUser.val('');
                delete config.httpStaticAuth;
                save();
        }
    });

    $adminauthSet.click(() => {
        const user = $.trim($adminauthUser.val());
        const pw1 = $adminauthPass1.val();
        const pw2 = $adminauthPass2.val();

        let valid = true;

        if (!user) {
            $adminauthUser.addClass('is-invalid');
            valid = false;
        } else {
            $adminauthUser.removeClass('is-invalid');
        }

        if (!pw1 || pw1 !== pw2) {
            $adminauthPass1.addClass('is-invalid');
            $adminauthPass2.addClass('is-invalid');
            valid = false;
        } else {
            $adminauthPass1.removeClass('is-invalid');
            $adminauthPass2.removeClass('is-invalid');
        }

        if (valid) {
            config = Object.assign(config, {
                adminAuth: {
                    type: 'credentials',
                    sessionExpiryTime: parseInt($adminauthSessionExpiryTime.val(), 10) || 604800,
                    users: [{
                        username: user,
                        password: bcrypt.hashSync(pw1, 8),
                        permissions: '*'
                    }]
                }
            });
            save();
        }
    });

    $staticauthSet.click(() => {
        const user = $.trim($staticauthUser.val());
        const pw1 = $staticauthPass1.val();
        const pw2 = $staticauthPass2.val();

        let valid = true;

        if (!user) {
            $staticauthUser.addClass('is-invalid');
            valid = false;
        } else {
            $staticauthUser.removeClass('is-invalid');
        }

        if (!pw1 || pw1 !== pw2) {
            $staticauthPass1.addClass('is-invalid');
            $staticauthPass2.addClass('is-invalid');
            valid = false;
        } else {
            $staticauthPass1.removeClass('is-invalid');
            $staticauthPass2.removeClass('is-invalid');
        }

        if (valid) {
            config = Object.assign(config, {
                httpStaticAuth: {
                    user,
                    pass: bcrypt.hashSync(pw1, 8),
                }
            });
            save();
        }
    });

    $nodeauthSet.click(() => {
        const user = $.trim($nodeauthUser.val());
        const pw1 = $nodeauthPass1.val();
        const pw2 = $nodeauthPass2.val();

        let valid = true;

        if (!user) {
            $nodeauthUser.addClass('is-invalid');
            valid = false;
        } else {
            $nodeauthUser.removeClass('is-invalid');
        }

        if (!pw1 || pw1 !== pw2) {
            $nodeauthPass1.addClass('is-invalid');
            $nodeauthPass2.addClass('is-invalid');
            valid = false;
        } else {
            $nodeauthPass1.removeClass('is-invalid');
            $nodeauthPass2.removeClass('is-invalid');
        }

        if (valid) {
            config = Object.assign(config, {
                httpNodeAuth: {
                    user,
                    pass: bcrypt.hashSync(pw1, 8),
                }
            });
            save();
        }
    });

    function restart() {
        clearTimeout(psTimeout);
        $dropdownRestart.addClass('disabled');
        $stop.addClass('disabled');
        $dropdownStart.addClass('disabled');
        $status.html('<span class="status-starting">stopping</span>');
        $memory.html('');
        $.get({
            url: `service.cgi?sid=${sid}&cmd=restart`,
            success: data => {
                if (data.match(/Starting Node-RED: OK/)) {
                    alert($alertExec);
                } else if ($.trim(data) === 'error: invalid session') {
                    invalidSession();
                    return;
                } else {
                    alert($alertError);
                }
                psInterval = 1000;
                setTimeout(() => {
                    ps();
                }, 1000);
            }
        });
    }

    $restart.click(() => {
        restart();
    });

    function safeMode(cb) {
        $.get({
            url: `safemode.cgi?sid=${sid}`,
            success: cb
        });
    }

    $restartSafe.click(() => {
        safeMode(restart);
    });

    function start() {
        $dropdownRestart.addClass('disabled');
        $stop.addClass('disabled');
        $dropdownStart.addClass('disabled');
        $status.html('<span class="status-starting">starting</span>');
        $memory.html('');
        $.get({
            url: `service.cgi?sid=${sid}&cmd=start`,
            success: data => {
                if ($.trim(data) === 'error: invalid session') {
                    invalidSession();
                    return;
                }

                if (data.match(/Starting Node-RED: OK/)) {
                    psInterval = 2000;
                    setTimeout(() => {
                        ps();
                    }, 6000);
                    alert($alertExec);
                } else {
                    alert($alertError);
                }
            }
        });
    }

    $start.click(() => {
        start();
    });

    $startSafe.click(() => {
        safeMode(start);
    });

    $stop.click(() => {
        clearTimeout(psTimeout);
        $dropdownRestart.addClass('disabled');
        $stop.addClass('disabled');
        $dropdownStart.addClass('disabled');
        $status.html('<span class="status-starting">stopping</span>');
        $memory.html('');
        $.get({
            url: `service.cgi?sid=${sid}&cmd=stop`,
            success: data => {
                if ($.trim(data) === 'error: invalid session') {
                    invalidSession();
                    return;
                }
                if (data.match(/Stopping Node-RED: OK/)) {
                    alert($alertExec);
                    psInterval = 2000;
                    setTimeout(() => {
                        ps();
                    }, 6000);
                } else {
                    alert($alertError);
                }
            }
        });
    });

    function setHeader(xhr) {
        xhr.setRequestHeader('accept', 'application/vnd.npm.install-v1+json; q=1.0, application/json; q=0.8, */*');
    }

    $.get('restart_count', data => {
        $('#restarts').html(data || 'keine');
    });

    function download(filename, dataUrl) {
        let link = document.createElement("a");
        link.download = filename;
        link.target = "_blank";

        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
    }

    $('#log').on('click', () => {
        download('redmatic.' + (new Date()).toISOString() + '.log', 'log.cgi' + location.search);
    });

    $('#autorestart').on('change', event => {
        config.restartOnCrash = parseInt(event.target.value, 10);
        save();
    });

    $backup.on('change', () => {
        config.ccuBackup = $backup.val();
        save();
    });

    $('#discard-package-hint').on('click', () => {
        localStorage.setItem('package-hint', 'discarded');
        $('#package-hint').hide();
    });
    if (localStorage.getItem('package-hint') !== 'discarded') {
        $('#package-hint').show();
    }

    $('#package-filter').on('keyup', () => {
        const filter = $('#package-filter').val();
        $packageTable.find('tr').each(function () {
            const name = $(this).find('td').html();
            if (name.includes(filter)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });

});

