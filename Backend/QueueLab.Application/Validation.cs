using QueueLab.Domain;

namespace QueueLab.Application;

public static class SimulationValidator
{
    public static List<string> Validate(SimulationConfiguration c)
    {
        var e = new List<string>();
        if (c.CustomerCount is < 1 or > 10000) e.Add("customerCount must be between 1 and 10000.");
        if (c.ServerCount is < 1 or > 20) e.Add("serverCount must be between 1 and 20.");
        if (c.ServiceTime.Type == ServiceTimeType.Fixed && c.ServiceTime.Base <= 0) e.Add("Fixed service time must be positive.");
        if (c.ServiceTime.Type == ServiceTimeType.Variable &&
            (c.ServiceTime.Min <= 0 || c.ServiceTime.Max < c.ServiceTime.Min))
            e.Add("Variable service time requires 0 < min <= max.");
        if (c.AdverseEvents.Probability is < 0 or > 1) e.Add("Adverse event probability must be between 0 and 1.");
        if (c.AdverseEvents.AdditionalTimeMin < 0 || c.AdverseEvents.AdditionalTimeMax < c.AdverseEvents.AdditionalTimeMin)
            e.Add("Adverse event additional time range is invalid.");
        return e;
    }
}