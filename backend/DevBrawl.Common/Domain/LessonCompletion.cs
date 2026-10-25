using System.Text.RegularExpressions;

namespace DevBrawl.Common.Domain;

// A lesson the player has finished (its quiz answered without a mistake). The key is (UserId, LessonId),
// so a lesson is only ever completed once.
public class LessonCompletion
{
    public const int LessonIdMaxLength = 100;

    // Lessons live in the frontend, so the backend can't check that one exists; it only accepts a slug
    private static readonly Regex Slug = new("^[a-z0-9]+(-[a-z0-9]+)*$", RegexOptions.Compiled);

    public Guid UserId { get; set; }
    // The lesson's slug, e.g. "http-methods"
    public string LessonId { get; set; } = string.Empty;
    public DateTime CompletedAt { get; set; }

    public static bool IsValidLessonId(string lessonId) =>
        lessonId.Length <= LessonIdMaxLength && Slug.IsMatch(lessonId);
}
