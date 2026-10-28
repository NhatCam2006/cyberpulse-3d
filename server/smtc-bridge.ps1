[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' }

Function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(1000) | Out-Null
    if ($netTask.IsCompleted) { return $netTask.Result }
    return $null
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType = WindowsRuntime] | Out-Null
$manager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

if (-not $manager) {
    [Console]::WriteLine('{"status":"error","message":"SMTC_UNAVAILABLE"}')
    exit
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media, ContentType = WindowsRuntime] | Out-Null

while ($true) {
    try {
        $current = $manager.GetCurrentSession()
        if (-not $current) {
            $sessions = $manager.GetSessions()
            foreach ($s in $sessions) {
                if ($s.GetPlaybackInfo().PlaybackStatus.ToString() -eq "Playing") {
                    $current = $s
                    break
                }
            }
            if (-not $current -and $sessions.Count -gt 0) {
                $current = $sessions[0]
            }
        }

        if ($current) {
            $props = Await ($current.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
            $timeline = $current.GetTimelineProperties()
            $playbackInfo = $current.GetPlaybackInfo()

            $title = if ($props) { $props.Title } else { "" }
            $artist = if ($props) { $props.Artist } else { "" }
            $album = if ($props) { $props.AlbumTitle } else { "" }
            $status = if ($playbackInfo) { $playbackInfo.PlaybackStatus.ToString() } else { "Unknown" }
            $pos = if ($timeline) { [Math]::Round($timeline.Position.TotalSeconds, 1) } else { 0 }
            $dur = if ($timeline) { [Math]::Round($timeline.EndTime.TotalSeconds, 1) } else { 0 }

            $json = [PSCustomObject]@{
                title = $title
                artist = $artist
                album = $album
                status = $status
                position = $pos
                duration = $dur
                source = "smtc"
            } | ConvertTo-Json -Compress

            [Console]::WriteLine($json)
        } else {
            [Console]::WriteLine('{"status":"idle","source":"smtc"}')
        }
    } catch {
        [Console]::WriteLine('{"status":"error","source":"smtc"}')
    }
    Start-Sleep -Milliseconds 800
}
