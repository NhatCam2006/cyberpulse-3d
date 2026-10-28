using System;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;

namespace CyberpulseVolume
{
    class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            string command = args.Length > 0 ? args[0].Trim().ToLowerInvariant() : "get";
            string targetProc = args.Length > 1 ? args[1].Trim().ToLowerInvariant() : "spotify";

            float targetVolume = -1f;
            int targetMute = -1; // -1: no change, 0: unmute, 1: mute

            if (command == "mute") {
                targetMute = 1;
            } else if (command == "unmute") {
                targetMute = 0;
            } else if (command == "get") {
                // just read
            } else {
                // Check if numeric volume
                float parsed;
                if (float.TryParse(command, NumberStyles.Float, CultureInfo.InvariantCulture, out parsed)) {
                    if (parsed < 0f) parsed = 0f;
                    if (parsed > 1f) parsed = 1f;
                    targetVolume = parsed;
                    targetMute = (targetVolume == 0f) ? 1 : 0;
                }
            }

            try {
                IMMDeviceEnumerator deviceEnumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
                IMMDevice speakers;
                int hr = deviceEnumerator.GetDefaultAudioEndpoint(EDataFlow.eRender, ERole.eMultimedia, out speakers);
                if (hr != 0 || speakers == null) {
                    Console.WriteLine("{\"ok\":false,\"error\":\"Cannot get default audio endpoint (hr=0x" + hr.ToString("X8") + ")\"}");
                    return;
                }

                Guid iidAudioSessionManager2 = typeof(IAudioSessionManager2).GUID;
                object o;
                hr = speakers.Activate(ref iidAudioSessionManager2, 23 /* CLSCTX_ALL */, IntPtr.Zero, out o);
                if (hr != 0 || o == null) {
                    Console.WriteLine("{\"ok\":false,\"error\":\"Cannot activate IAudioSessionManager2 (hr=0x" + hr.ToString("X8") + ")\"}");
                    return;
                }

                IAudioSessionManager2 mgr = (IAudioSessionManager2)o;
                IAudioSessionEnumerator sessionEnumerator;
                hr = mgr.GetSessionEnumerator(out sessionEnumerator);
                if (hr != 0 || sessionEnumerator == null) {
                    Console.WriteLine("{\"ok\":false,\"error\":\"Cannot get session enumerator (hr=0x" + hr.ToString("X8") + ")\"}");
                    return;
                }

                int count;
                sessionEnumerator.GetCount(out count);
                int matched = 0;
                float finalVol = -1f;
                bool finalMuted = false;
                uint matchedPid = 0;
                Guid emptyGuid = Guid.Empty;

                for (int i = 0; i < count; i++)
                {
                    IAudioSessionControl ctl;
                    sessionEnumerator.GetSession(i, out ctl);
                    IAudioSessionControl2 ctl2 = ctl as IAudioSessionControl2;
                    if (ctl2 != null)
                    {
                        uint processId;
                        ctl2.GetProcessId(out processId);
                        bool isMatch = false;
                        if (processId > 0) {
                            try {
                                var proc = Process.GetProcessById((int)processId);
                                if (proc != null && proc.ProcessName.ToLowerInvariant().Contains(targetProc)) {
                                    isMatch = true;
                                    matchedPid = processId;
                                }
                            } catch {}
                        }

                        if (isMatch) {
                            ISimpleAudioVolume vol = ctl as ISimpleAudioVolume;
                            if (vol != null) {
                                if (targetVolume >= 0f) {
                                    vol.SetMasterVolume(targetVolume, ref emptyGuid);
                                }
                                if (targetMute >= 0) {
                                    vol.SetMute(targetMute, ref emptyGuid);
                                }

                                float curVol;
                                int curMuted;
                                vol.GetMasterVolume(out curVol);
                                vol.GetMute(out curMuted);

                                finalVol = curVol;
                                finalMuted = (curMuted != 0);
                                matched++;
                            }
                        }
                    }
                    if (ctl != null) Marshal.ReleaseComObject(ctl);
                }

                if (matched > 0) {
                    Console.WriteLine("{\"ok\":true,\"matched\":" + matched + ",\"pid\":" + matchedPid + ",\"volume\":" + finalVol.ToString("0.000", CultureInfo.InvariantCulture) + ",\"muted\":" + (finalMuted ? "true" : "false") + "}");
                } else {
                    Console.WriteLine("{\"ok\":false,\"error\":\"Spotify session not found in active audio sessions\"}");
                }
            } catch (Exception ex) {
                Console.WriteLine("{\"ok\":false,\"error\":\"" + ex.Message.Replace("\"", "\\\"") + "\"}");
            }
        }
    }

    internal enum EDataFlow { eRender, eCapture, eAll }
    internal enum ERole { eConsole, eMultimedia, eCommunications }

    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    internal class MMDeviceEnumerator { }

    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IMMDeviceEnumerator
    {
        int NotImpl1();
        [PreserveSig]
        int GetDefaultAudioEndpoint(EDataFlow dataFlow, ERole role, out IMMDevice ppDevice);
    }

    [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IMMDevice
    {
        [PreserveSig]
        int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
    }

    [Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioSessionManager2
    {
        int NotImpl1();
        int NotImpl2();
        [PreserveSig]
        int GetSessionEnumerator(out IAudioSessionEnumerator SessionEnum);
    }

    [Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioSessionEnumerator
    {
        [PreserveSig]
        int GetCount(out int SessionCount);
        [PreserveSig]
        int GetSession(int SessionIndex, out IAudioSessionControl Session);
    }

    internal enum AudioSessionState { AudioSessionStateInactive = 0, AudioSessionStateActive = 1, AudioSessionStateExpired = 2 }

    [Guid("F4B1A599-7266-4319-A8CA-E70ACB11E8CD"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioSessionControl
    {
        [PreserveSig] int GetState(out AudioSessionState pRetVal);
        [PreserveSig] int GetDisplayName(out string pRetVal);
        [PreserveSig] int SetDisplayName(string Value, ref Guid EventContext);
        [PreserveSig] int GetIconPath(out string pRetVal);
        [PreserveSig] int SetIconPath(string Value, ref Guid EventContext);
        [PreserveSig] int GetGroupingParam(out Guid pRetVal);
        [PreserveSig] int SetGroupingParam(ref Guid Override, ref Guid EventContext);
        [PreserveSig] int RegisterAudioSessionNotification(IntPtr pClient);
        [PreserveSig] int UnregisterAudioSessionNotification(IntPtr pClient);
    }

    [Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioSessionControl2 : IAudioSessionControl
    {
        [PreserveSig] new int GetState(out AudioSessionState pRetVal);
        [PreserveSig] new int GetDisplayName(out string pRetVal);
        [PreserveSig] new int SetDisplayName(string Value, ref Guid EventContext);
        [PreserveSig] new int GetIconPath(out string pRetVal);
        [PreserveSig] new int SetIconPath(string Value, ref Guid EventContext);
        [PreserveSig] new int GetGroupingParam(out Guid pRetVal);
        [PreserveSig] new int SetGroupingParam(ref Guid Override, ref Guid EventContext);
        [PreserveSig] new int RegisterAudioSessionNotification(IntPtr pClient);
        [PreserveSig] new int UnregisterAudioSessionNotification(IntPtr pClient);
        [PreserveSig] int GetSessionIdentifier(out string pRetVal);
        [PreserveSig] int GetSessionInstanceIdentifier(out string pRetVal);
        [PreserveSig] int GetProcessId(out uint pRetVal);
        [PreserveSig] int IsSystemSoundsSession();
        [PreserveSig] int SetDuckingPreference(bool optOut);
    }

    [Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ISimpleAudioVolume
    {
        [PreserveSig] int SetMasterVolume(float fLevel, ref Guid eventContext);
        [PreserveSig] int GetMasterVolume(out float pfLevel);
        [PreserveSig] int SetMute(int bMute, ref Guid eventContext);
        [PreserveSig] int GetMute(out int pbMute);
    }
}
