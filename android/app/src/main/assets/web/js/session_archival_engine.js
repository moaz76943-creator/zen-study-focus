/**
 * DEEP FOCUS — Session Archival & Storage Defense Engine
 * Mission #039: LocalStorage quota monitoring, zero-loss monthly
 * partitioning, archive merging, and defensive deduplication.
 */
(function (global) {
  'use strict';

  var MAX_SAFE_STORAGE_BYTES = 4 * 1024 * 1024; // 4MB Safe Ceiling
  var ADVISORY_THRESHOLD_RATIO = 0.75; // 75%
  var CRITICAL_THRESHOLD_RATIO = 0.90; // 90%

  /**
   * Estimates byte size of UTF-8 string/object in storage.
   */
  function estimateByteSize(data) {
    if (!data) return 0;
    var str = typeof data === 'string' ? data : JSON.stringify(data);
    // Approximate UTF-8 byte count
    var bytes = 0;
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code <= 0x7f) bytes += 1;
      else if (code <= 0x7ff) bytes += 2;
      else if (code >= 0xd800 && code <= 0xdbff) {
        bytes += 4;
        i++; // Surrogate pair
      } else bytes += 3;
    }
    return bytes;
  }

  /**
   * Assesses storage health based on current serialized size.
   */
  function evaluateStorageHealth(totalSerializedBytes) {
    var bytes = typeof totalSerializedBytes === 'number' && totalSerializedBytes >= 0 ? totalSerializedBytes : 0;
    var ratio = bytes / MAX_SAFE_STORAGE_BYTES;
    var percentage = Math.min(100, Math.round(ratio * 100));

    var status = "HEALTHY";
    if (ratio >= CRITICAL_THRESHOLD_RATIO) {
      status = "CRITICAL";
    } else if (ratio >= ADVISORY_THRESHOLD_RATIO) {
      status = "ADVISORY";
    }

    return {
      usedBytes: bytes,
      maxSafeBytes: MAX_SAFE_STORAGE_BYTES,
      percentage: percentage,
      status: status
    };
  }

  /**
   * Extracts 'YYYY-MM' from timestamp or ISO date string.
   */
  function getPartitionKey(dateOrTimestamp) {
    var d = new Date(dateOrTimestamp);
    if (isNaN(d.getTime())) {
      d = new Date();
    }
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    return year + '-' + month;
  }

  /**
   * Partitions sessions into active recent sessions and monthly archives.
   * Sessions older than retentionCutoffDays are assigned to monthly buckets.
   */
  function partitionSessions(sessions, retentionCutoffDays) {
    var list = Array.isArray(sessions) ? sessions : [];
    var cutoffDays = typeof retentionCutoffDays === 'number' && retentionCutoffDays > 0 ? retentionCutoffDays : 90;
    var cutoffMs = Date.now() - (cutoffDays * 86400000);

    var activeSessions = [];
    var monthlyArchives = {};

    for (var i = 0; i < list.length; i++) {
      var session = list[i];
      if (!session || typeof session !== 'object') continue;

      var sessionTime = new Date(session.timestamp || session.date || 0).getTime();
      if (isNaN(sessionTime) || sessionTime === 0) {
        activeSessions.push(session);
        continue;
      }

      if (sessionTime >= cutoffMs) {
        activeSessions.push(session);
      } else {
        var key = getPartitionKey(sessionTime);
        if (!monthlyArchives[key]) {
          monthlyArchives[key] = [];
        }
        monthlyArchives[key].push(session);
      }
    }

    return {
      activeSessions: activeSessions,
      monthlyArchives: monthlyArchives,
      archivedCount: list.length - activeSessions.length
    };
  }

  /**
   * Merges archive sessions back into active dataset with ID deduplication.
   */
  function mergeSessions(baseSessions, archiveSessions) {
    var base = Array.isArray(baseSessions) ? baseSessions.slice() : [];
    var archive = Array.isArray(archiveSessions) ? archiveSessions : [];

    var seenIds = Object.create(null);
    for (var i = 0; i < base.length; i++) {
      if (base[i] && base[i].id) {
        seenIds[base[i].id] = true;
      }
    }

    for (var j = 0; j < archive.length; j++) {
      var item = archive[j];
      if (item && item.id) {
        if (!seenIds[item.id]) {
          seenIds[item.id] = true;
          base.push(item);
        }
      } else if (item) {
        base.push(item);
      }
    }

    return base;
  }

  /**
   * Packages archive chunk with the official v21 fortress backup marker.
   */
  function packageArchiveChunk(partitionKey, sessions) {
    var list = Array.isArray(sessions) ? sessions : [];
    return {
      marker: "ZEN21::ARCHIVE",
      partition: partitionKey,
      count: list.length,
      createdAt: new Date().toISOString(),
      sessions: list
    };
  }

  var engine = {
    MAX_SAFE_STORAGE_BYTES: MAX_SAFE_STORAGE_BYTES,
    estimateByteSize: estimateByteSize,
    evaluateStorageHealth: evaluateStorageHealth,
    getPartitionKey: getPartitionKey,
    partitionSessions: partitionSessions,
    mergeSessions: mergeSessions,
    packageArchiveChunk: packageArchiveChunk
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  } else {
    global.SessionArchivalEngine = engine;
  }
})(typeof window !== 'undefined' ? window : this);
