package com.hussain.urlshortener.service;

import com.hussain.urlshortener.error.DuplicateException;
import com.hussain.urlshortener.error.ResourceNotFoundException;
import com.hussain.urlshortener.model.Url;
import com.hussain.urlshortener.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShortenerService {
    private final UrlRepository urlRepository;

    public Url expand(final Long id) {
        return urlRepository.findById(id).orElseThrow(ResourceNotFoundException::new);
    }

    public Url shorten(final Url url) {
        try {
            return urlRepository.save(url);
        } catch (DataIntegrityViolationException e) {
            log.error("exception", e);
            throw new DuplicateException("entry already exists");
        }
    }
}
