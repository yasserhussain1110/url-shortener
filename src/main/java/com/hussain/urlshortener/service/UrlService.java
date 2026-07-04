package com.hussain.urlshortener.service;

import com.hussain.urlshortener.config.CacheConfig;
import com.hussain.urlshortener.exception.UrlNotFoundException;
import com.hussain.urlshortener.model.Url;
import com.hussain.urlshortener.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UrlService {
    private final UrlRepository urlRepository;

    public Url shorten(Url url) {
        return urlRepository.findByOriginalUrl(url.getOriginalUrl())
                .orElseGet(() -> getOrSaveUrlOnDatabase(url));
    }

    @Cacheable(value = CacheConfig.URLS_CACHE, key = "#id")
    public Url expand(Long id) {
        return urlRepository.findById(id).orElseThrow(UrlNotFoundException::new);
    }

    public List<Url> findAll() {
        return urlRepository.findAll();
    }

    private Url getOrSaveUrlOnDatabase(Url url) {
        try {
            return urlRepository.save(url);
        } catch (DataIntegrityViolationException e) {
            log.warn("Tried to save pre-existing url: {}", url.getOriginalUrl(),  e);
            return urlRepository.findByOriginalUrl(url.getOriginalUrl())
                    .orElseThrow();
        }
    }
}
