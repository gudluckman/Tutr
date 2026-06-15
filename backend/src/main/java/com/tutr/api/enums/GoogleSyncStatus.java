package com.tutr.api.enums;

import com.tutr.api.converter.*;
import com.tutr.api.dto.*;
import com.tutr.api.entity.*;
import com.tutr.api.enums.*;
import com.tutr.api.repository.*;
import com.tutr.api.service.*;

public enum GoogleSyncStatus {
    NOT_REQUESTED,
    NOT_CONNECTED,
    SYNCED,
    FAILED
}
