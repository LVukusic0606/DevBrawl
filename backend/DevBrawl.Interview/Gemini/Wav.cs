using System.Text;
using System.Text.RegularExpressions;

namespace DevBrawl.Interview.Gemini;

// Gemini's speech models return WAV, or raw 16-bit PCM ("audio/L16;rate=24000"); browsers can only play the former
internal static partial class Wav
{
    public static bool IsWav(byte[] audio) =>
        audio.Length >= 12 && Encoding.ASCII.GetString(audio, 0, 4) == "RIFF" && Encoding.ASCII.GetString(audio, 8, 4) == "WAVE";

    public static int? SampleRateOf(string mimeType) =>
        RateParameter().Match(mimeType) is { Success: true } match ? int.Parse(match.Groups[1].Value) : null;

    // Mono 16-bit little-endian PCM with a 44-byte WAV header in front
    public static byte[] FromPcm16(byte[] pcm, int sampleRate)
    {
        using var stream = new MemoryStream(44 + pcm.Length);
        using var writer = new BinaryWriter(stream);
        writer.Write("RIFF"u8);
        writer.Write(36 + pcm.Length);
        writer.Write("WAVEfmt "u8);
        writer.Write(16);
        writer.Write((short)1); // PCM
        writer.Write((short)1); // mono
        writer.Write(sampleRate);
        writer.Write(sampleRate * 2);
        writer.Write((short)2);
        writer.Write((short)16);
        writer.Write("data"u8);
        writer.Write(pcm.Length);
        writer.Write(pcm);
        return stream.ToArray();
    }

    [GeneratedRegex(@"rate=(\d+)")]
    private static partial Regex RateParameter();
}
