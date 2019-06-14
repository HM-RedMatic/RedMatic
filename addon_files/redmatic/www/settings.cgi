#!/bin/tclsh

load tclrega.so

catch {
  set input $env(QUERY_STRING)
  set pairs [split $input &]
  foreach pair $pairs {
    if {0 != [regexp "^(\[^=]*)=(.*)$" $pair dummy varname val]} {
      set $varname $val
    }
  }
}

puts -nonewline "Content-Type: text/html; charset=utf-8\r\n\r\n"

if {[info exists sid] > 0} {
    # Session prüfen
    if {
        ([string index $sid 0] != "@")
        || ([string index $sid [expr [string length $sid] -1]]  != "@")
        || ([string length $sid] != 12)} {
        set fp [open "/usr/local/addons/redmatic/www/session-error.html" r]
        puts -nonewline [read $fp]
        close $fp
    } else {
        regsub -all {@} $sid "" sid
        set res [lindex [rega_script "Write(system.GetSessionVarStr('$sid'));"] 1]
        if {$res != ""} {
            # gültige Session
            set fp [open "/usr/local/addons/redmatic/www/settings.html" r]
            puts -nonewline [read $fp]
            close $fp
        } else {
            puts {error: session invalid}
        }
    }
} else {
    set fp [open "/usr/local/addons/redmatic/www/session-error.html" r]
    puts -nonewline [read $fp]
    close $fp
}
