CREATE TABLE urls (
    id BIGINT NOT NULL AUTO_INCREMENT,
    original_url VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_urls_original_url (original_url)
);
