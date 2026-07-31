function transform(input) {
  if (!input || !input.IDX_0 || !input.IDX_1) {
    throw new Error("Invalid input: IDX_0 or IDX_1 missing");
  }

  const gauge = input.IDX_0;
  const stageflow = input.IDX_1;

  // -----------------------------
  // Reduce IDX_0 (gauge metadata)
  // -----------------------------
  const reducedGauge = {
    name: gauge?.name ?? "",

    status: {
      observed: {
        primary: gauge?.status?.observed?.primary ?? null,
        primaryUnit: gauge?.status?.observed?.primaryUnit ?? "",
        secondary: gauge?.status?.observed?.secondary ?? null,
        secondaryUnit: gauge?.status?.observed?.secondaryUnit ?? ""
      },
      forecast: {
        primary: gauge?.status?.forecast?.primary ?? null,
        primaryUnit: gauge?.status?.forecast?.primaryUnit ?? "",
        secondary: gauge?.status?.forecast?.secondary ?? null,
        secondaryUnit: gauge?.status?.forecast?.secondaryUnit ?? ""
      }
    },

    flood: {
      categories: {
        action: gauge?.flood?.categories?.action?.stage != null
          ? { stage: gauge.flood.categories.action.stage }
          : undefined,

        minor: gauge?.flood?.categories?.minor?.stage != null
          ? { stage: gauge.flood.categories.minor.stage }
          : undefined,

        moderate: gauge?.flood?.categories?.moderate?.stage != null
          ? { stage: gauge.flood.categories.moderate.stage }
          : undefined,

        major: gauge?.flood?.categories?.major?.stage != null
          ? { stage: gauge.flood.categories.major.stage }
          : undefined
      }
    }
  };

  // --------------------------------
  // Helper to reduce time-series data
  // --------------------------------
  function reduceSeries(series, { cutoff, hourlyOnly } = {}) {
    if (!series || !Array.isArray(series.data)) {
      return { data: [] };
    }

    return {
      data: series.data
        .filter(d =>
          d &&
          d.validTime &&
          !d.validTime.includes(':15:00') &&
          !d.validTime.includes(':45:00') &&
          (!hourlyOnly || !d.validTime.includes(':30:00')) &&
          d.primary != null &&
          d.primary > -9000 && // NOAA missing-data sentinel
          (!cutoff || Date.parse(d.validTime) >= cutoff)
        )
        .map(d => ({
          t: d.validTime,
          p: Math.round(d.primary * 100) / 100
        }))
    };
  }

  // Only keep as much observed history as the user asked to chart, so the
  // payload doesn't always carry NOAA's full ~30-day window. Beyond 14 days
  // also drop to hourly resolution to keep longer windows from ballooning
  // the payload; forecast data stays at full resolution.
  const historyDays = Number(
    input?.trmnl?.plugin_settings?.custom_fields_values?.nwps_history_days ?? 7
  );
  const observedCutoff = Date.now() - historyDays * 24 * 60 * 60 * 1000;
  const reduceObservedResolution = historyDays > 14;

  // -------------------------------
  // Reduce IDX_1 (stage/flow series)
  // -------------------------------
  const reducedStageflow = {
    observed: {
      issuedTime: stageflow?.observed?.issuedTime ?? "",
      primaryUnits: stageflow?.observed?.primaryUnits ?? "",
      data: reduceSeries(stageflow.observed, {
        cutoff: observedCutoff,
        hourlyOnly: reduceObservedResolution
      }).data
    },

    forecast: {
      data: reduceSeries(stageflow.forecast).data
    }
  };

  // -------------------------------
  // Return reduced payload
  // -------------------------------
  return {
    IDX_0: reducedGauge,
    IDX_1: reducedStageflow
  };
}
