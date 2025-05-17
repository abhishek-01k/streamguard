/// StreamGuard Core Stream Management Module
/// Handles live streaming, VOD content, and Walrus storage integration
module streamguard::stream_manager {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use std::string::{Self, String};
    use std::vector;
    use std::option::{Self, Option};

    // Error codes
    const ENotStreamOwner: u64 = 1;
    const EStreamNotActive: u64 = 2;
    const EInsufficientPayment: u64 = 3;
    const EStreamAlreadyEnded: u64 = 4;
    const EInvalidQuality: u64 = 5;
    const EWalrusStorageError: u64 = 6;

    // Stream status constants
    const STREAM_STATUS_CREATED: u8 = 0;
    const STREAM_STATUS_LIVE: u8 = 1;
    const STREAM_STATUS_ENDED: u8 = 2;
    const STREAM_STATUS_ARCHIVED: u8 = 3;

    // Quality levels
    const QUALITY_240P: u8 = 0;
    const QUALITY_480P: u8 = 1;
    const QUALITY_720P: u8 = 2;
    const QUALITY_1080P: u8 = 3;
    const QUALITY_4K: u8 = 4;

    /// Core stream object representing a live stream or VOD content
    public struct Stream has key, store {
        id: UID,
        creator: address,
        title: String,
        description: String,
        category: String,
        thumbnail_walrus_id: String,
        hls_manifest_walrus_id: String,
        status: u8,
        created_at: u64,
        started_at: u64,
        ended_at: u64,
        viewer_count: u64,
        total_revenue: Balance<SUI>,
        revenue_splits: Table<address, u64>, // address -> percentage (basis points)
        quality_levels: vector<u8>,
        is_monetized: bool,
        subscription_price: u64, // in MIST (1 SUI = 1,000,000,000 MIST)
        tip_enabled: bool,
        moderation_score: u64,
        content_rating: String,
        tags: vector<String>,
        walrus_segments: Table<u64, String>, // segment_number -> walrus_blob_id
    }

    /// Stream configuration for creating new streams
    public struct StreamConfig has copy, drop {
        title: String,
        description: String,
        category: String,
        thumbnail_walrus_id: String,
        quality_levels: vector<u8>,
        is_monetized: bool,
        subscription_price: u64,
        tip_enabled: bool,
        content_rating: String,
        tags: vector<String>,
    }

    /// Viewer session for tracking engagement and payments
    public struct ViewerSession has key, store {
        id: UID,
        stream_id: ID,
        viewer: address,
        started_at: u64,
        last_heartbeat: u64,
        total_watch_time: u64,
        quality_level: u8,
        has_paid: bool,
        tips_sent: u64,
    }

    /// Stream analytics data
    public struct StreamAnalytics has key, store {
        id: UID,
        stream_id: ID,
        total_views: u64,
        unique_viewers: u64,
        peak_concurrent_viewers: u64,
        total_watch_time: u64,
        average_watch_time: u64,
        revenue_generated: u64,
        tips_received: u64,
        quality_distribution: Table<u8, u64>, // quality_level -> view_count
        geographic_data: Table<String, u64>, // region -> view_count
    }

    /// Global stream registry
    public struct StreamRegistry has key {
        id: UID,
        total_streams: u64,
        active_streams: u64,
        total_creators: u64,
        featured_streams: vector<ID>,
        category_streams: Table<String, vector<ID>>,
    }

    // Events
    public struct StreamCreated has copy, drop {
        stream_id: ID,
        creator: address,
        title: String,
        category: String,
        timestamp: u64,
    }

    public struct StreamStarted has copy, drop {
        stream_id: ID,
        creator: address,
        timestamp: u64,
    }

    public struct StreamEnded has copy, drop {
        stream_id: ID,
        creator: address,
        duration: u64,
        total_viewers: u64,
        revenue: u64,
        timestamp: u64,
    }

    public struct ViewerJoined has copy, drop {
        stream_id: ID,
        viewer: address,
        timestamp: u64,
    }

    public struct TipSent has copy, drop {
        stream_id: ID,
        from: address,
        to: address,
        amount: u64,
        message: String,
        timestamp: u64,
    }

    public struct WalrusSegmentStored has copy, drop {
        stream_id: ID,
        segment_number: u64,
        walrus_blob_id: String,
        timestamp: u64,
    }

    /// Initialize the stream registry (called once during module deployment)
    fun init(ctx: &mut TxContext) {
        let registry = StreamRegistry {
            id: object::new(ctx),
            total_streams: 0,
            active_streams: 0,
            total_creators: 0,
            featured_streams: vector::empty(),
            category_streams: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    /// Create a new stream
    public fun create_stream(
        config: StreamConfig,
        registry: &mut StreamRegistry,
        clock: &Clock,
        ctx: &mut TxContext
    ): Stream {
        let stream_id = object::new(ctx);
        let creator = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        // Validate quality levels
        let mut i = 0;
        let quality_len = vector::length(&config.quality_levels);
        while (i < quality_len) {
            let quality = *vector::borrow(&config.quality_levels, i);
            assert!(quality <= QUALITY_4K, EInvalidQuality);
            i = i + 1;
        };

        let stream = Stream {
            id: stream_id,
            creator,
            title: config.title,
            description: config.description,
            category: config.category,
            thumbnail_walrus_id: config.thumbnail_walrus_id,
            hls_manifest_walrus_id: string::utf8(b""),
            status: STREAM_STATUS_CREATED,
            created_at: current_time,
            started_at: 0,
            ended_at: 0,
            viewer_count: 0,
            total_revenue: balance::zero(),
            revenue_splits: table::new(ctx),
            quality_levels: config.quality_levels,
            is_monetized: config.is_monetized,
            subscription_price: config.subscription_price,
            tip_enabled: config.tip_enabled,
            moderation_score: 100, // Start with perfect score
            content_rating: config.content_rating,
            tags: config.tags,
            walrus_segments: table::new(ctx),
        };

        // Update registry
        registry.total_streams = registry.total_streams + 1;
        
        // Add to category
        if (!table::contains(&registry.category_streams, config.category)) {
            table::add(&mut registry.category_streams, config.category, vector::empty());
        };
        let category_streams = table::borrow_mut(&mut registry.category_streams, config.category);
        vector::push_back(category_streams, object::uid_to_inner(&stream.id));

        // Emit event
        event::emit(StreamCreated {
            stream_id: object::uid_to_inner(&stream.id),
            creator,
            title: config.title,
            category: config.category,
            timestamp: current_time,
        });

        stream
    }

    /// Start a live stream
    public fun start_stream(
        stream: &mut Stream,
        hls_manifest_walrus_id: String,
        registry: &mut StreamRegistry,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(stream.creator == tx_context::sender(ctx), ENotStreamOwner);
        assert!(stream.status == STREAM_STATUS_CREATED, EStreamNotActive);

        let current_time = clock::timestamp_ms(clock);
        stream.status = STREAM_STATUS_LIVE;
        stream.started_at = current_time;
        stream.hls_manifest_walrus_id = hls_manifest_walrus_id;

        // Update registry
        registry.active_streams = registry.active_streams + 1;

        // Emit event
        event::emit(StreamStarted {
            stream_id: object::uid_to_inner(&stream.id),
            creator: stream.creator,
            timestamp: current_time,
        });
    }

    /// End a live stream
    public fun end_stream(
        stream: &mut Stream,
        registry: &mut StreamRegistry,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(stream.creator == tx_context::sender(ctx), ENotStreamOwner);
        assert!(stream.status == STREAM_STATUS_LIVE, EStreamNotActive);

        let current_time = clock::timestamp_ms(clock);
        stream.status = STREAM_STATUS_ENDED;
        stream.ended_at = current_time;

        // Update registry
        registry.active_streams = registry.active_streams - 1;

        let duration = current_time - stream.started_at;
        let revenue = balance::value(&stream.total_revenue);

        // Emit event
        event::emit(StreamEnded {
            stream_id: object::uid_to_inner(&stream.id),
            creator: stream.creator,
            duration,
            total_viewers: stream.viewer_count,
            revenue,
            timestamp: current_time,
        });
    }

    /// Store a video segment on Walrus
    public fun store_walrus_segment(
        stream: &mut Stream,
        segment_number: u64,
        walrus_blob_id: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(stream.creator == tx_context::sender(ctx), ENotStreamOwner);
        
        table::add(&mut stream.walrus_segments, segment_number, walrus_blob_id);

        // Emit event
        event::emit(WalrusSegmentStored {
            stream_id: object::uid_to_inner(&stream.id),
            segment_number,
            walrus_blob_id,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Join a stream as a viewer
    public fun join_stream(
        stream: &mut Stream,
        mut payment: Option<Coin<SUI>>,
        clock: &Clock,
        ctx: &mut TxContext
    ): ViewerSession {
        assert!(stream.status == STREAM_STATUS_LIVE, EStreamNotActive);

        let viewer = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        let mut has_paid = false;

        // Handle payment for monetized streams
        if (stream.is_monetized && option::is_some(&payment)) {
            let coin = option::extract(&mut payment);
            let amount = coin::value(&coin);
            assert!(amount >= stream.subscription_price, EInsufficientPayment);
            
            balance::join(&mut stream.total_revenue, coin::into_balance(coin));
            has_paid = true;
        };

        // Clean up empty payment option
        if (option::is_some(&payment)) {
            let coin = option::extract(&mut payment);
            transfer::public_transfer(coin, viewer);
        };
        option::destroy_none(payment);

        // Update viewer count
        stream.viewer_count = stream.viewer_count + 1;

        // Create viewer session
        let session = ViewerSession {
            id: object::new(ctx),
            stream_id: object::uid_to_inner(&stream.id),
            viewer,
            started_at: current_time,
            last_heartbeat: current_time,
            total_watch_time: 0,
            quality_level: QUALITY_720P, // Default quality
            has_paid,
            tips_sent: 0,
        };

        // Emit event
        event::emit(ViewerJoined {
            stream_id: object::uid_to_inner(&stream.id),
            viewer,
            timestamp: current_time,
        });

        session
    }

    /// Send a tip to the stream creator
    public fun send_tip(
        stream: &mut Stream,
        session: &mut ViewerSession,
        tip: Coin<SUI>,
        message: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(stream.tip_enabled, EStreamNotActive);
        assert!(session.viewer == tx_context::sender(ctx), ENotStreamOwner);

        let amount = coin::value(&tip);
        balance::join(&mut stream.total_revenue, coin::into_balance(tip));
        session.tips_sent = session.tips_sent + amount;

        // Emit event
        event::emit(TipSent {
            stream_id: object::uid_to_inner(&stream.id),
            from: session.viewer,
            to: stream.creator,
            amount,
            message,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Update viewer heartbeat and watch time
    public fun update_viewer_heartbeat(
        session: &mut ViewerSession,
        quality_level: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(session.viewer == tx_context::sender(ctx), ENotStreamOwner);
        assert!(quality_level <= QUALITY_4K, EInvalidQuality);

        let current_time = clock::timestamp_ms(clock);
        let time_diff = current_time - session.last_heartbeat;
        
        session.total_watch_time = session.total_watch_time + time_diff;
        session.last_heartbeat = current_time;
        session.quality_level = quality_level;
    }

    /// Distribute revenue to stakeholders
    public fun distribute_revenue(
        stream: &mut Stream,
        ctx: &mut TxContext
    ) {
        assert!(stream.creator == tx_context::sender(ctx), ENotStreamOwner);
        
        let total_balance = balance::value(&stream.total_revenue);
        if (total_balance == 0) return;

        // Extract all revenue
        let revenue_coin = coin::from_balance(
            balance::split(&mut stream.total_revenue, total_balance),
            ctx
        );

        // For now, send all to creator (can be extended for revenue splits)
        transfer::public_transfer(revenue_coin, stream.creator);
    }

    // Getter functions
    public fun get_stream_info(stream: &Stream): (String, String, String, u8, u64, u64) {
        (stream.title, stream.description, stream.category, stream.status, stream.viewer_count, balance::value(&stream.total_revenue))
    }

    public fun get_walrus_manifest(stream: &Stream): String {
        stream.hls_manifest_walrus_id
    }

    public fun get_walrus_segment(stream: &Stream, segment_number: u64): String {
        *table::borrow(&stream.walrus_segments, segment_number)
    }

    public fun is_stream_live(stream: &Stream): bool {
        stream.status == STREAM_STATUS_LIVE
    }

    public fun get_subscription_price(stream: &Stream): u64 {
        stream.subscription_price
    }

    public fun is_monetized(stream: &Stream): bool {
        stream.is_monetized
    }

    public fun get_viewer_session_info(session: &ViewerSession): (address, u64, u64, bool) {
        (session.viewer, session.total_watch_time, session.tips_sent, session.has_paid)
    }

    // Test functions
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
} 